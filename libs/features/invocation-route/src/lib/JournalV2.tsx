import type {
  components,
  InvocationStatus,
  JournalEntryV2,
} from '@restate/data-access-admin-api-spec';
import {
  Dispatch,
  memo,
  RefCallback,
  RefObject,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation, useSearchParams } from 'react-router';
import type { VirtualItem } from '@tanstack/react-virtual';
import { getDuration, SnapshotTimeProvider } from '@restate/util-snapshot-time';
import { Link } from '@restate/ui-link';
import { Icon, IconName } from '@restate/ui-icons';
import { Button } from '@restate/ui-button';
import { HoverTooltip } from '@restate/ui-tooltip';
import { useRestateContext } from '@restate/features-restate-context';
import { ErrorBanner } from '@restate/ui-error';
import {
  JournalContextProvider,
  useJournalTimelineContext,
} from '@restate/features-invocation-ui';
import { Indicator, Spinner } from '@restate/ui-loading';
import { Entry } from '@restate/features-invocation-ui';
import { useFailureRelatedCommandIndex } from '@restate/features-invocation-ui';
import { Input } from '@restate/features-invocation-ui';
import { isTargetInvocationEntry } from '@restate/features-invocation-ui';
import {
  EntryProgress,
  hasEntryProgress,
  timelineBaselineStyles,
} from './EntryProgress';
import { TIMELINE_DRAW_WINDOW_INSET } from './TimelineScale';
import { SegmentWidthProvider } from './segmentWidth';
import {
  drawsSendTrail,
  getSendInvocationId,
  type SendChild,
} from './sendChild';
import {
  PortalProvider,
  UnitsPortalTarget,
  ViewportSelectorPortalTarget,
  ZoomControlsPortalTarget,
} from './Portals';
import { LifeCycleProgress } from './LifeCycleProgress';
import { StartDateTimeUnit } from './Units';
import { ScrollableTimeline } from './ScrollableTimeline';
import { ErrorBoundary } from './ErrorBoundry';
import { tv } from '@restate/util-styles';
import {
  isCompletedInvocationStatus,
  useWarmInvocationStatusDetails,
  useGetInvocationsJournalWithInvocationsV2,
} from '@restate/data-access-admin-api-hooks';
import { formatDurations, formatPlurals } from '@restate/util-intl';
import {
  TimelineEngineProvider,
  useTimelineEngineContext,
} from '@restate/ui-timeline-zoom';
import {
  ContentPanelHeader,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui-content-panel';
import {
  CombinedJournalEntry,
  useProcessedJournal,
} from './useProcessedJournal';
import { useContainerWidth } from './useContainerWidth';
import { useWindowScrollMargin } from './useWindowScrollMargin';
import {
  useGrowRenderWindowWhenIdle,
  useRenderWindow,
} from './useRenderWindow';
import { useQuietWindowVirtualizer } from './useQuietWindowVirtualizer';
import {
  getExpandIdsToDrop,
  getFocusInvocationId,
  getFocusViewport,
  getInitialInvocationIds,
} from './journalFocus';
import {
  getEventRelatedInvocationIds,
  getReferencedInvocationIds,
  getShownInvocationIds,
} from './referencedInvocations';
import { Retention } from '@restate/features-invocation-ui';
import {
  COMPACT_DETAIL,
  useJournalDetail,
  type JournalDetail,
} from '@restate/features-invocation-ui';
import { JournalDetailToggle } from './JournalDetailToggle';
import { useHiddenEntryMatchers } from './hiddenEntries';
import {
  JournalSplitSeparator,
  journalSplitStyles,
  useJournalSplit,
} from './JournalSplit';
import {
  getPastRetries,
  getProblemRowKey,
  getRetryKey,
  type PastRetries,
  type ProblemTone,
} from './problemRows';
import {
  INPUT_ROW,
  ProblemChildCheck,
  useJournalProblems,
} from './useJournalProblems';
import { JournalProblemsBar } from './JournalProblemsBar';
import { PastRetriesBadge } from './PastRetriesBadge';

const virtualRowStyles = tv({
  base: '',
  variants: {
    isFocused: {
      true: 'bg-accent-subtle/50',
      false: '',
    },
    hasTimeline: {
      true: 'border-b border-transparent pr-2 pl-2',
      false: '',
    },
  },
});

const inputHeaderStyles = tv({
  base: 'relative flex h-full min-w-0 items-center',
  variants: {
    isActive: {
      true: 'bg-accent-subtle/50',
      false: '',
    },
  },
});

const problemMarkStyles = tv({
  base: 'pointer-events-none absolute top-2 bottom-2 left-0 z-[1] w-0.5 rounded-r-full',
  variants: {
    tone: {
      danger: 'bg-danger-strong',
      warning: 'bg-warning-strong',
      info: 'bg-info-strong',
      neutral: 'bg-neutral',
    },
  },
});

const liveStyles = tv({
  base: 'flex items-center gap-1 rounded-sm px-2 text-xs font-semibold text-muted uppercase',
  variants: {
    isLive: {
      true: '',
      false: '',
    },
  },
});

const LIVE_EDGE_THRESHOLD_MS = 500;
const JOURNAL_BOTTOM_PADDING_PX = 50;

// Trailing headroom appended to a completed trace's timeline so the final
// entries (and their right-aligned duration labels) sit a little inside the
// right edge instead of flush against it. Expressed as a fraction of the trace
// duration, so at the default full-trace view it reads as a constant ~5% gap
// and stays consistent between the overview selector and the main timeline. Not
// applied while live — there the now-edge/follow window governs the right side.
const TIMELINE_COMPLETED_END_HEADROOM_RATIO = 0.05;

function hasNonCompletedReferencedInvocations(
  invocationIds: string[],
  invocations?: Record<
    string,
    components['schemas']['InvocationStatusResult'] | undefined
  >,
) {
  return invocationIds.some((invocationId) => {
    const invocation = invocations?.[invocationId];
    return !isCompletedInvocationStatus(invocation?.status);
  });
}

function findCommandRow(
  entries: CombinedJournalEntry[],
  invocationId: string,
  commandIndex?: number,
) {
  if (typeof commandIndex !== 'number') {
    return -1;
  }
  return entries.findIndex(
    ({ invocationId: entryInvocationId, entry }) =>
      entryInvocationId === invocationId &&
      entry?.category === 'command' &&
      entry.commandIndex === commandIndex,
  );
}

const LIVE_REFETCH_MIN_MS = 1_000;
const LIVE_REFETCH_MAX_MS = 10_000;
const ENTRIES_PER_REFETCH_MS = 10;
const MAX_ENTRIES_WITHOUT_TIMELINE = 50;

type JournalInvocation = ReturnType<
  typeof useGetInvocationsJournalWithInvocationsV2
>['data'][string];

function getLiveRefetchInterval(entryCount = 0) {
  return Math.min(
    LIVE_REFETCH_MAX_MS,
    Math.max(LIVE_REFETCH_MIN_MS, entryCount / ENTRIES_PER_REFETCH_MS),
  );
}

function hasPendingJournalUpdates(invocation?: JournalInvocation) {
  return (
    !invocation?.completed_at ||
    invocation.journal_commands_size !==
      invocation.journal?.entries?.filter((e) => e.category === 'command')
        .length
  );
}

function getCommandIndexFromHash(hash: string) {
  const match = /^#command-(\d+)$/.exec(hash);
  return match ? Number(match[1]) : undefined;
}

function getJournalEntryKey(entry: JournalEntryV2 | undefined, index: number) {
  if (
    entry?.category === 'group' &&
    'id' in entry &&
    typeof entry.id === 'string'
  ) {
    return entry.id;
  }

  return entry?.index ?? index;
}

export interface JournalV2Props {
  invocationId: string;
  className?: string;
  timelineWidth?: number;
  showApiError?: boolean;
  withTimeline?: boolean;
  // Tenant view hides the SQL introspection link; the main app keeps it by default.
  showIntrospection?: boolean;
}

export function JournalV2({
  invocationId,
  className,
  timelineWidth = 0.5,
  showApiError = true,
  withTimeline = true,
  showIntrospection = true,
}: JournalV2Props) {
  const [isLive, setIsLive] = useState(true);
  const isScrollingRef = useRef(false);
  const [searchParams] = useSearchParams();
  const [invocationIds, setInvocationIds] = useState(() =>
    withTimeline
      ? getInitialInvocationIds(String(invocationId), searchParams)
      : [String(invocationId)],
  );
  const focusInvocationId = withTimeline
    ? getFocusInvocationId(searchParams)
    : undefined;
  const {
    data,
    isPending,
    error: apiError,
    refetch,
    invalidate,
    dataUpdatedAt: allQueriesDataUpdatedAt,
  } = useGetInvocationsJournalWithInvocationsV2(invocationIds, {
    refetchOnMount: true,
    staleTime: 0,
    refetchInterval(query) {
      if (
        isLive &&
        !isScrollingRef.current &&
        query.state.status === 'success' &&
        hasPendingJournalUpdates(query.state.data)
      ) {
        return getLiveRefetchInterval(
          query.state.data?.journal?.entries?.length,
        );
      } else {
        return false;
      }
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });

  const hiddenEntryMatchersByInvocation = useHiddenEntryMatchers(data);

  // The detailed-view selection lives in the URL (?detail=). The toggle is only
  // shown on the full timeline view; embedded previews (withTimeline={false})
  // stay compact and don't read or write the URL. The `hidden` category is only
  // offered when a loaded handler actually defines hidden entries.
  const journalDetail = useJournalDetail({
    hasHiddenEntries: hiddenEntryMatchersByInvocation.size > 0,
  });
  const detail = withTimeline ? journalDetail.detail : COMPACT_DETAIL;

  const addInvocationId = useCallback(
    (id: string) => {
      invalidate();
      setInvocationIds((ids) => [...ids, id]);
    },
    [invalidate],
  );
  const removeInvocationId = useCallback((idToBeRemoved: string) => {
    setInvocationIds((ids) => {
      return ids.filter((id) => id !== idToBeRemoved);
    });
  }, []);

  const journalAndInvocationData = data?.[invocationId];

  const { baseUrl } = useRestateContext();
  const split = useJournalSplit(1 - timelineWidth);
  const entriesPanelId = useId();
  const { columns: splitColumns, timelineOverlay: splitTimelineOverlay } =
    journalSplitStyles();

  const {
    entriesWithoutInput: allEntriesWithoutInput,
    inputEntry,
    relatedEntriesByInvocation,
    lifecycleDataByInvocation,
    hiddenEntriesCount,
  } = useProcessedJournal(
    invocationId,
    data,
    detail,
    hiddenEntryMatchersByInvocation,
  );
  const hasMoreEntries =
    !withTimeline &&
    allEntriesWithoutInput.length > MAX_ENTRIES_WITHOUT_TIMELINE;
  const entriesWithoutInputUnfiltered = withTimeline
    ? allEntriesWithoutInput
    : allEntriesWithoutInput.slice(0, MAX_ENTRIES_WITHOUT_TIMELINE);

  const invocationApiError = apiError?.[invocationId];
  const dataUpdatedAt = allQueriesDataUpdatedAt[invocationId]!;
  const shownInvocationIds = useMemo(
    () => getShownInvocationIds(invocationId, allEntriesWithoutInput),
    [invocationId, allEntriesWithoutInput],
  );
  const latestDataUpdatedAt = Math.max(
    dataUpdatedAt,
    ...[...shownInvocationIds].map((id) => allQueriesDataUpdatedAt[id] ?? 0),
  );

  const start = journalAndInvocationData
    ? new Date(
        journalAndInvocationData?.created_at ??
          new Date(dataUpdatedAt).toISOString(),
      ).getTime()
    : 0;
  const areAllInvocationsCompleted = [...shownInvocationIds].every(
    (id) => !data[id] || data[id]?.completed_at,
  );
  const maxEntryTimestamp = useMemo(
    () =>
      entriesWithoutInputUnfiltered.reduce(
        (max, { entry }) =>
          Math.max(
            max,
            entry?.end
              ? new Date(entry.end).getTime()
              : entry?.start
                ? new Date(entry.start).getTime()
                : -1,
          ),
        -Infinity,
      ),
    [entriesWithoutInputUnfiltered],
  );
  const completedTimelineEnd =
    maxEntryTimestamp > start
      ? maxEntryTimestamp +
        (maxEntryTimestamp - start) * TIMELINE_COMPLETED_END_HEADROOM_RATIO
      : maxEntryTimestamp;
  const end = journalAndInvocationData
    ? Math.max(
        areAllInvocationsCompleted ? completedTimelineEnd : maxEntryTimestamp,
        !areAllInvocationsCompleted ? latestDataUpdatedAt : -1,
      )
    : 0;

  const journalProblems = useJournalProblems({
    enabled: Boolean(withTimeline),
    invocationId,
    data,
    rows: entriesWithoutInputUnfiltered,
    inputEntry,
    showErrors: Boolean(detail.errors),
  });
  const entriesWithoutInput = journalProblems.entries;
  const shownProblemRows = journalProblems.navigableRows;
  const activeProblemIndex = journalProblems.activeProblemIndex;
  const activeProblemPosition = journalProblems.activeProblemPosition;
  // The server returns an empty `entries` array when the journal has been
  // purged (or was never written). Detect this once everything has loaded so
  // we can surface a "Journal was purged" message instead of an empty pane.
  const isJournalEmpty =
    !isPending[invocationId] &&
    !invocationApiError &&
    Boolean(journalAndInvocationData) &&
    (journalAndInvocationData?.journal?.entries?.length ?? 0) === 0;

  const getItemKey = useCallback(
    (index: number) => {
      const entry = entriesWithoutInput[index];
      return entry
        ? `${entry.invocationId}-${getJournalEntryKey(
            entry.entry,
            index,
          )}-${entry.entry?.type}-${index}`
        : index;
    },
    [entriesWithoutInput],
  );
  const entriesListRef = useRef<HTMLDivElement>(null);
  const [entriesListCallbackRef, scrollMargin] =
    useWindowScrollMargin(entriesListRef);
  const renderWindow = useRenderWindow();
  const virtualizer = useQuietWindowVirtualizer({
    count: entriesWithoutInput.length,
    estimateSize: () => 36,
    scrollMargin,
    getItemKey,
    rangeExtractor: renderWindow.rangeExtractor,
  });
  renderWindow.scrollStateRef.current = virtualizer;
  useLayoutEffect(() => {
    isScrollingRef.current = virtualizer.isScrolling;
  });
  useGrowRenderWindowWhenIdle(
    renderWindow,
    virtualizer.isScrolling,
    entriesWithoutInput.length,
  );
  const totalSize = virtualizer.getTotalSize();
  const virtualItems = virtualizer.getVirtualItems();

  const { commandIndex: failureCommandIndex } = useFailureRelatedCommandIndex(
    journalAndInvocationData,
    { enabled: withTimeline },
  );
  const failureRowIndex = useMemo(
    () =>
      findCommandRow(entriesWithoutInput, invocationId, failureCommandIndex),
    [entriesWithoutInput, invocationId, failureCommandIndex],
  );
  const failureRow =
    failureRowIndex >= 0
      ? virtualizer.measurementsCache[failureRowIndex]
      : undefined;

  const { hash, key: locationKey } = useLocation();
  const scrolledLocationKey = useRef<string>(undefined);
  useEffect(() => {
    if (!withTimeline || scrolledLocationKey.current === locationKey) {
      return;
    }
    if (
      getCommandIndexFromHash(hash) !== undefined &&
      invocationIds.some((id) => isPending[id])
    ) {
      return;
    }
    const row =
      virtualizer.measurementsCache[
        findCommandRow(
          entriesWithoutInput,
          invocationId,
          getCommandIndexFromHash(hash),
        )
      ];
    const list = entriesListRef.current;
    if (!list) {
      return;
    }
    if (!row) {
      if (journalAndInvocationData) {
        scrolledLocationKey.current = locationKey;
      }
      return;
    }
    scrolledLocationKey.current = locationKey;
    const listTop = list.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top:
        listTop +
        row.start -
        scrollMargin +
        row.size / 2 -
        window.innerHeight / 2,
    });
  }, [
    withTimeline,
    hash,
    locationKey,
    entriesWithoutInput,
    invocationId,
    invocationIds,
    isPending,
    virtualizer,
    scrollMargin,
    journalAndInvocationData,
  ]);

  const focusRowIndex = focusInvocationId
    ? entriesWithoutInput.findIndex(
        (entry) => entry.invocationId === focusInvocationId,
      )
    : -1;
  const focusedInvocation = focusInvocationId
    ? data[focusInvocationId]
    : undefined;

  const hasDecidedFocusViewport = useRef(false);
  const pendingUrlExpandIds = useRef(invocationIds.slice(1));
  useEffect(() => {
    if (pendingUrlExpandIds.current.length === 0) {
      return;
    }
    const unreachableIds = getExpandIdsToDrop({
      expandIds: pendingUrlExpandIds.current,
      invocationIds,
      rootId: invocationId,
      isLoaded: (id) => Boolean(data[id]),
      isPending: (id) => Boolean(isPending[id]),
      shownIds: shownInvocationIds,
    });
    if (!unreachableIds) {
      return;
    }
    pendingUrlExpandIds.current = [];
    if (unreachableIds.length > 0) {
      setInvocationIds((ids) =>
        ids.filter((id) => !unreachableIds.includes(id)),
      );
    }
  }, [invocationId, invocationIds, isPending, data, shownInvocationIds]);
  const hasScrolledToFocus = useRef(false);
  useEffect(() => {
    const row = virtualizer.measurementsCache[focusRowIndex];
    const list = entriesListRef.current;
    if (
      getCommandIndexFromHash(hash) !== undefined &&
      !hasScrolledToFocus.current
    ) {
      hasScrolledToFocus.current = true;
      return;
    }
    if (!withTimeline || hasScrolledToFocus.current || !row || !list) {
      return;
    }
    hasScrolledToFocus.current = true;
    window.scrollTo({
      top:
        list.getBoundingClientRect().top +
        window.scrollY +
        row.start -
        scrollMargin -
        window.innerHeight / 3,
    });
  }, [withTimeline, focusRowIndex, virtualizer, scrollMargin, hash]);
  const rowCenter = (index: number) => {
    const row = virtualizer.measurementsCache[index];
    return row ? row.start - scrollMargin + row.size / 2 : index * 36;
  };
  const scrollToProblemRow = (target: number) => {
    if (target === INPUT_ROW) {
      journalProblems.selectProblem(INPUT_ROW);
      return;
    }
    const list = entriesListRef.current;
    if (!list) {
      return;
    }
    journalProblems.selectProblem(target);
    const listRect = list.getBoundingClientRect();
    const row = virtualizer.measurementsCache[target];
    const rowTop =
      listRect.top + (row ? row.start - scrollMargin : target * 36);
    const rowBottom = rowTop + (row?.size ?? 36);
    const visibleTop =
      (document.querySelector('[data-journal-header]')?.getBoundingClientRect()
        .bottom ?? 0) + 8;
    const visibleBottom = window.innerHeight - 96;
    if (rowTop >= visibleTop && rowBottom <= visibleBottom) {
      return;
    }
    window.scrollTo({
      top:
        listRect.top +
        window.scrollY +
        rowCenter(target) -
        window.innerHeight / 2,
    });
  };
  const goToProblem = (direction: 1 | -1) => {
    const list = entriesListRef.current;
    if (!list || shownProblemRows.length === 0) {
      return;
    }
    const listTop = list.getBoundingClientRect().top + window.scrollY;
    let target: number | undefined;
    if (activeProblemPosition >= 0) {
      target =
        shownProblemRows[
          (activeProblemPosition + direction + shownProblemRows.length) %
            shownProblemRows.length
        ];
    } else {
      const center = window.scrollY + window.innerHeight / 2 - listTop;
      target =
        direction === 1
          ? (shownProblemRows.find((index) => rowCenter(index) > center + 1) ??
            shownProblemRows[0])
          : (shownProblemRows.findLast(
              (index) => rowCenter(index) < center - 1,
            ) ?? shownProblemRows.at(-1));
    }
    if (target === undefined) {
      return;
    }
    scrollToProblemRow(target);
  };
  const goToProblemRef = useRef(goToProblem);
  useLayoutEffect(() => {
    goToProblemRef.current = goToProblem;
  });
  const goToPreviousProblem = useCallback(() => goToProblemRef.current(-1), []);
  const goToNextProblem = useCallback(() => goToProblemRef.current(1), []);
  const eventRelatedInvocationIds = useMemo(
    () =>
      getEventRelatedInvocationIds(journalAndInvocationData?.journal?.entries),
    [journalAndInvocationData],
  );
  const referencedInvocationIds = virtualizer.isScrolling
    ? []
    : [
        ...new Set([
          ...getReferencedInvocationIds(
            withTimeline
              ? entriesWithoutInput.slice(
                  Math.max(0, (virtualizer.range?.startIndex ?? 0) - 24),
                  (virtualizer.range?.endIndex ?? -1) + 25,
                )
              : entriesWithoutInput,
          ),
          ...eventRelatedInvocationIds,
        ]),
      ];
  const {
    data: referencedInvocationStatuses,
    isError: isReferencedInvocationStatusesError,
    dataUpdatedAt: referencedInvocationStatusesUpdatedAt,
  } = useWarmInvocationStatusDetails(referencedInvocationIds, invocationId, {
    refetchOnMount: true,
    staleTime: 0,
    refetchInterval(query) {
      if (
        isLive &&
        !isScrollingRef.current &&
        hasNonCompletedReferencedInvocations(
          referencedInvocationIds,
          query.state.data?.invocations,
        )
      ) {
        return 1000;
      }

      return false;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });

  const [containerWidthRef, containerWidthPx] = useContainerWidth();

  if (invocationApiError && showApiError && !journalAndInvocationData) {
    return (
      <ContentPanelSection>
        <div className="px-2">
          <ErrorBanner
            error={invocationApiError}
            className="flex-none rounded-xl"
          />
        </div>
      </ContentPanelSection>
    );
  }

  if (isPending[invocationId]) {
    const loading = (
      <div className="flex items-center gap-1.5 px-4 py-2 text-sm text-muted">
        <Spinner className="h-4 w-4" />
        Loading…
      </div>
    );
    return withTimeline ? (
      <ContentPanelSection>{loading}</ContentPanelSection>
    ) : (
      <div className={className}>{loading}</div>
    );
  }

  if (!journalAndInvocationData) {
    return null;
  }

  const typedInputEntry = inputEntry as
    | Extract<JournalEntryV2, { type?: 'Input'; category?: 'command' }>
    | undefined;

  return (
    <PortalProvider>
      {journalProblems.childCheck.invocationIds.length > 0 && (
        <ProblemChildCheck
          invocationIds={journalProblems.childCheck.invocationIds}
          referenceInvocationId={invocationId}
          isLive={isLive}
          isScrolling={virtualizer.isScrolling}
          onProgress={journalProblems.childCheck.onProgress}
        />
      )}
      <TimelineEngineProvider
        actualStart={start}
        actualEnd={end}
        authoritativeNowMs={latestDataUpdatedAt}
        areAllCompleted={areAllInvocationsCompleted}
        isLiveEnabled={isLive}
        containerWidthPx={containerWidthPx}
      >
        {withTimeline && focusRowIndex >= 0 && (
          <FocusedInvocationViewport
            decidedRef={hasDecidedFocusViewport}
            start={getTime(focusedInvocation?.created_at)}
            end={getTime(focusedInvocation?.completed_at)}
          />
        )}
        <TimelineEngineJournalBridge
          invocationIds={invocationIds}
          addInvocationId={addInvocationId}
          removeInvocationId={removeInvocationId}
          start={start}
          end={end}
          dataUpdatedAt={dataUpdatedAt}
          isPending={isPending}
          error={apiError}
          areAllInvocationsCompleted={areAllInvocationsCompleted}
          isLive={isLive}
          detail={detail}
        >
          <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
            <Suspense
              fallback={
                <ContentPanelSection>
                  <div className="flex items-center gap-1.5 p-4 text-sm text-muted">
                    <Spinner className="h-4 w-4" />
                    Loading…
                  </div>
                </ContentPanelSection>
              }
            >
              {withTimeline && (
                <ContentPanelToolbar className="relative">
                  <JournalProblemsBar
                    isProblemsOnly={journalProblems.isProblemsOnly}
                    onModeChange={journalProblems.setProblemsOnly}
                    problemTotal={journalProblems.problemTotal}
                    problemStats={journalProblems.problemStats}
                    find={journalProblems.findText}
                    onFindChange={journalProblems.setFindText}
                    matchCount={journalProblems.matchCount}
                    navigableTotal={shownProblemRows.length}
                    announcement={journalProblems.announcement}
                    checkProgress={journalProblems.childCheck.progress}
                    checkLimit={journalProblems.childCheck.limit}
                    onPrevious={goToPreviousProblem}
                    onNext={goToNextProblem}
                  />
                  <div className="z-10 ml-auto flex flex-row items-center justify-end gap-1 self-end rounded-lg bg-linear-to-l from-canvas via-canvas to-canvas/5 pl-10">
                    <JournalDetailToggle
                      availableCategories={journalDetail.availableCategories}
                      selectedCategories={journalDetail.selectedCategories}
                      isCompact={journalDetail.isCompact}
                      onCompact={journalDetail.setCompact}
                      onDetailed={journalDetail.setDetailed}
                      onChange={journalDetail.setSelection}
                    />
                    <ZoomControlsPortalTarget className="hidden md:flex" />
                    <ReturnToLiveButton
                      areAllCompleted={areAllInvocationsCompleted}
                      isLive={isLive}
                      setIsLive={setIsLive}
                    />
                    {areAllInvocationsCompleted && (
                      <HoverTooltip content="Refresh">
                        <Button variant="icon" onClick={refetch}>
                          <Icon name={IconName.Retry} className="h-4 w-4" />
                        </Button>
                      </HoverTooltip>
                    )}
                    {showIntrospection && (
                      <HoverTooltip content="Introspect">
                        <Link
                          variant="icon"
                          href={`${baseUrl}/introspection?query=SELECT id, index, appended_at, entry_type, name, entry_lite_json AS metadata FROM sys_journal WHERE id = '${journalAndInvocationData?.id}'`}
                          target="_blank"
                        >
                          <Icon
                            name={IconName.ScanSearch}
                            className="h-4 w-4"
                          />
                        </Link>
                      </HoverTooltip>
                    )}
                  </div>
                </ContentPanelToolbar>
              )}
              {withTimeline && (
                <ContentPanelHeader className="font-mono text-0.5xs">
                  <div
                    ref={split.headerRef}
                    className="relative h-9 w-full"
                    data-journal-header
                  >
                    <div className="pointer-events-none absolute inset-0 z-30 hidden md:block">
                      <div
                        className={splitTimelineOverlay({
                          className: 'h-full',
                        })}
                        data-journal-timeline-start
                      >
                        <StartDateTimeUnit start={start} />
                      </div>
                    </div>
                    <div
                      className={splitColumns({
                        className: 'h-full w-full md:grid',
                      })}
                    >
                      <div
                        className={inputHeaderStyles({
                          isActive: journalProblems.isInputActive,
                        })}
                      >
                        {journalProblems.inputTone && (
                          <span
                            aria-hidden
                            className={problemMarkStyles({
                              tone: journalProblems.inputTone,
                            })}
                          />
                        )}
                        <Input
                          entry={typedInputEntry}
                          invocation={data?.[invocationId]}
                        />
                        {!detail.hidden && (
                          <HiddenEntriesChip
                            count={hiddenEntriesCount}
                            className="mt-0.5 mr-2 ml-auto"
                          />
                        )}
                      </div>
                      <div
                        ref={containerWidthRef}
                        className="relative hidden min-w-0 md:block"
                      >
                        <div className="relative h-full overflow-hidden rounded-tr-2xl">
                          <LifeCycleProgress
                            className="h-9 px-2"
                            invocation={journalAndInvocationData}
                            createdEvent={
                              lifecycleDataByInvocation.get(invocationId)
                                ?.createdEvent
                            }
                            lifeCycleEntries={
                              lifecycleDataByInvocation.get(invocationId)
                                ?.lifeCycleEntries ?? []
                            }
                          />
                          <ViewportSelectorPortalTarget className="absolute inset-x-0 inset-y-0 z-10 my-auto h-6" />
                        </div>
                      </div>
                    </div>
                  </div>
                </ContentPanelHeader>
              )}
              {withTimeline ? (
                <div className="relative flex min-h-0 flex-1 flex-col">
                  {isJournalEmpty ? (
                    <JournalPurgedMessage />
                  ) : (
                    <div className="relative isolate flex min-h-0 flex-1 flex-col font-mono text-0.5xs">
                      <div
                        ref={split.bodyRef}
                        className={splitColumns({
                          className:
                            'relative grid min-h-full flex-1 grid-cols-1',
                        })}
                      >
                        {/* Left panel */}
                        <div
                          data-panel
                          id={entriesPanelId}
                          className="z-[2] grid min-w-0"
                          style={{
                            marginBottom: JOURNAL_BOTTOM_PADDING_PX,
                            minHeight: totalSize,
                            gridTemplateColumns: '1fr',
                            gridTemplateRows: '1fr',
                          }}
                        >
                          {/* Content */}
                          <ContentPanelSection
                            className="z-[2] col-start-1 row-start-1 min-w-0 md:border-r"
                            style={{ minHeight: totalSize }}
                          >
                            <VirtualizedEntries
                              ref={entriesListCallbackRef}
                              virtualItems={virtualItems}
                              scrollMargin={scrollMargin}
                              totalSize={totalSize}
                              entriesWithoutInput={entriesWithoutInput}
                              data={data}
                              failureRow={failureRow}
                              focusInvocationId={focusInvocationId}
                              activeRowIndex={activeProblemIndex}
                              problemTones={journalProblems.problemTones}
                              pastRetries={journalProblems.pastRetries}
                              onToggleRetries={journalProblems.toggleRetryRow}
                              isRetryRowExpanded={
                                journalProblems.isRetryRowExpanded
                              }
                            />
                            {journalAndInvocationData && (
                              <div className="flex items-center gap-1.5 px-6 py-2 font-sans text-xs text-muted">
                                <Retention
                                  invocation={journalAndInvocationData}
                                  type="journal"
                                  prefixForCompletion="retention "
                                  prefixForInProgress="retained "
                                />
                              </div>
                            )}
                          </ContentPanelSection>
                        </div>
                        <JournalSplitSeparator
                          ref={split.separatorRef}
                          split={split}
                          controls={entriesPanelId}
                        />
                        {/* Right panel - grid container for overlapping Units */}
                        <div
                          data-panel
                          className="relative hidden min-w-0 bg-tint-subtle md:grid"
                          style={{
                            minHeight: totalSize,
                            gridTemplateColumns: '1fr',
                            gridTemplateRows: '1fr',
                          }}
                        >
                          {/* Sticky Units - limited to viewport height */}
                          <UnitsPortalTarget className="pointer-events-none sticky top-[var(--cp-content-top,0px)] z-10 col-start-1 row-start-1 mt-[var(--cp-section-pt,0px)] h-[calc(100%-var(--cp-section-pt,0px))] max-h-[calc(100vh-var(--cp-content-top,0px))] overflow-hidden [--timeline-units-header-offset:0rem]" />

                          {/* Scrollable timeline content with Units overlay */}
                          <ContentPanelSection
                            className="relative z-[2] col-start-1 row-start-1 h-full"
                            style={{ minHeight: totalSize }}
                            fadeClassName="from-muted"
                          >
                            <ScrollableTimeline
                              cancelEvent={
                                lifecycleDataByInvocation.get(invocationId)
                                  ?.cancelEvent
                              }
                            >
                              <SegmentWidthProvider>
                                <VirtualizedTimeline
                                  virtualItems={virtualItems}
                                  scrollMargin={scrollMargin}
                                  totalSize={totalSize}
                                  entriesWithoutInput={entriesWithoutInput}
                                  data={data}
                                  relatedEntriesByInvocation={
                                    relatedEntriesByInvocation
                                  }
                                  referencedInvocations={
                                    referencedInvocationStatuses?.invocations
                                  }
                                  isReferencedInvocationsError={
                                    isReferencedInvocationStatusesError
                                  }
                                  focusInvocationId={focusInvocationId}
                                  activeRowIndex={activeProblemIndex}
                                  childNow={
                                    referencedInvocationStatusesUpdatedAt
                                  }
                                  shownInvocationIds={shownInvocationIds}
                                />
                              </SegmentWidthProvider>
                            </ScrollableTimeline>
                          </ContentPanelSection>
                        </div>
                      </div>
                    </div>
                  )}
                  <div data-last-failure-fallback aria-hidden className="h-0" />
                </div>
              ) : (
                <div className={className}>
                  <ContentPanelHeader className="rounded-tl-2xl rounded-bl-2xl">
                    <Input
                      entry={typedInputEntry}
                      invocation={data?.[invocationId]}
                    />
                  </ContentPanelHeader>
                  {entriesWithoutInput.map(
                    (
                      {
                        invocationId: entryInvocationId,
                        entry,
                        depth,
                        parentCommand,
                      },
                      index,
                    ) => {
                      const invocation = data?.[entryInvocationId];
                      return (
                        <ErrorBoundary
                          entry={entry}
                          className="h-9"
                          key={`${entryInvocationId}-${entry?.category}-${entry?.type}-${getJournalEntryKey(
                            entry,
                            index,
                          )}-${index}`}
                        >
                          <Entry
                            invocation={invocation}
                            entry={entry}
                            depth={depth}
                            nextDepth={entriesWithoutInput[index + 1]?.depth}
                            parentCommand={parentCommand}
                          />
                        </ErrorBoundary>
                      );
                    },
                  )}
                  {hasMoreEntries && (
                    <Link
                      variant="icon"
                      href={`${baseUrl}/invocations/${invocationId}`}
                      className="flex items-center justify-center gap-1 py-3 text-xs text-accent hover:text-accent-strong"
                    >
                      View all entries
                      <Icon name={IconName.ChevronRight} className="h-3 w-3" />
                    </Link>
                  )}
                  <div data-last-failure-fallback aria-hidden className="h-0" />
                </div>
              )}
            </Suspense>
          </SnapshotTimeProvider>
        </TimelineEngineJournalBridge>
      </TimelineEngineProvider>
    </PortalProvider>
  );
}

function getTime(date?: string) {
  return date ? new Date(date).getTime() : undefined;
}

function FocusedInvocationViewport({
  decidedRef,
  start,
  end,
}: {
  decidedRef: RefObject<boolean>;
  start?: number;
  end?: number;
}) {
  const { setViewport, coordinateStart, actualDuration } =
    useTimelineEngineContext();
  const rangeEnd = coordinateStart + actualDuration;

  useEffect(() => {
    if (decidedRef.current) {
      return;
    }
    decidedRef.current = true;
    const viewport = getFocusViewport({
      start,
      end,
      rangeStart: coordinateStart,
      rangeEnd,
    });
    if (viewport) {
      setViewport(viewport.start, viewport.end);
    }
  }, [decidedRef, setViewport, coordinateStart, rangeEnd, start, end]);

  return null;
}

function TimelineEngineJournalBridge({
  invocationIds,
  addInvocationId,
  removeInvocationId,
  start,
  end,
  dataUpdatedAt,
  isPending,
  error,
  areAllInvocationsCompleted,
  isLive,
  detail,
  children,
}: {
  invocationIds: string[];
  addInvocationId: (id: string) => void;
  removeInvocationId: (id: string) => void;
  start: number;
  end: number;
  dataUpdatedAt: number;
  isPending: Record<string, boolean | undefined>;
  error?: Record<string, Error | null | undefined>;
  areAllInvocationsCompleted: boolean;
  isLive: boolean;
  detail: JournalDetail;
  children: React.ReactNode;
}) {
  return (
    <JournalContextProvider
      invocationIds={invocationIds}
      addInvocationId={addInvocationId}
      removeInvocationId={removeInvocationId}
      start={start}
      end={Math.max(end, start + 1)}
      dataUpdatedAt={dataUpdatedAt}
      isPending={isPending}
      error={error}
      isLive={!areAllInvocationsCompleted && isLive}
      detail={detail}
    >
      {children}
    </JournalContextProvider>
  );
}

function ReturnToLiveButton({
  areAllCompleted,
  isLive,
  setIsLive,
}: {
  areAllCompleted: boolean;
  isLive: boolean;
  setIsLive: Dispatch<React.SetStateAction<boolean>>;
}) {
  const engine = useTimelineEngineContext();
  const liveEdge = engine.coordinateStart + engine.actualDuration;
  const lagMs = Math.max(0, liveEdge - engine.viewportEnd);
  const isAtLiveEdge = lagMs <= LIVE_EDGE_THRESHOLD_MS;
  const lagLabel = `-${formatDurations(getDuration(Math.round(lagMs)))}`;

  if (areAllCompleted) return null;

  if (!isLive) {
    return (
      <Button
        variant="icon"
        className={liveStyles({ isLive: false })}
        onClick={() => setIsLive(true)}
      >
        <div className="">Live</div>
        <Icon name={IconName.Play} className="mb-px h-2.5 w-2.5 fill-current" />
      </Button>
    );
  }

  if (engine.mode !== 'live-follow' && !isAtLiveEdge) {
    return (
      <Button
        variant="icon"
        className={liveStyles({ isLive: true, className: 'normal-case' })}
        onClick={() => {
          engine.returnToLive();
          setIsLive(true);
        }}
      >
        <div className="w-[8ch] text-right font-mono tabular-nums">
          {lagLabel}
        </div>
        <Indicator status="INFO" className="mb-0.5" />
      </Button>
    );
  }

  return (
    <Button
      variant="icon"
      className={liveStyles({ isLive: true })}
      onClick={() => setIsLive(false)}
    >
      <div className="">Live</div>
      <Indicator status="INFO" className="mb-0.5" />
    </Button>
  );
}

const VirtualizedEntries = memo(function VirtualizedEntries({
  ref,
  virtualItems,
  scrollMargin,
  totalSize,
  entriesWithoutInput,
  data,
  failureRow,
  focusInvocationId,
  activeRowIndex,
  problemTones,
  pastRetries,
  onToggleRetries,
  isRetryRowExpanded,
}: {
  ref: RefCallback<HTMLDivElement>;
  virtualItems: VirtualItem[];
  scrollMargin: number;
  totalSize: number;
  entriesWithoutInput: CombinedJournalEntry[];
  data?: ReturnType<typeof useGetInvocationsJournalWithInvocationsV2>['data'];
  failureRow?: VirtualItem;
  focusInvocationId?: string;
  activeRowIndex?: number;
  problemTones?: ReadonlyMap<string, ProblemTone>;
  pastRetries?: ReadonlyMap<string, PastRetries>;
  onToggleRetries: (row: CombinedJournalEntry) => void;
  isRetryRowExpanded: (key: string) => boolean;
}) {
  return (
    <div
      ref={ref}
      className="overflow-clip"
      style={{
        height: totalSize,
        position: 'relative',
      }}
    >
      {failureRow && (
        <div
          data-last-failure-position
          aria-hidden
          className="pointer-events-none absolute inset-x-0"
          style={{
            top: failureRow.start - scrollMargin,
            height: failureRow.size,
          }}
        />
      )}
      {virtualItems.map((virtualItem) => {
        const combinedEntry = entriesWithoutInput[virtualItem.index];
        if (!combinedEntry) return null;
        const {
          invocationId: entryInvocationId,
          entry,
          depth,
          parentCommand,
        } = combinedEntry;
        const invocation = data?.[entryInvocationId];
        const retries = pastRetries
          ? getPastRetries(combinedEntry, pastRetries)
          : undefined;

        return (
          <div
            key={virtualItem.key}
            className={virtualRowStyles({
              isFocused:
                entryInvocationId === focusInvocationId ||
                virtualItem.index === activeRowIndex,
            })}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualItem.size,
              transform: `translateY(${virtualItem.start - scrollMargin}px)`,
            }}
          >
            {problemTones?.has(getProblemRowKey(combinedEntry) ?? '') && (
              <span
                aria-hidden
                className={problemMarkStyles({
                  tone: problemTones.get(getProblemRowKey(combinedEntry) ?? ''),
                })}
              />
            )}
            <ErrorBoundary
              entry={entry}
              className="sticky top-[var(--cp-content-top,0px)] h-9"
            >
              <Entry
                invocation={invocation}
                entry={entry}
                depth={depth}
                nextDepth={entriesWithoutInput[virtualItem.index + 1]?.depth}
                parentCommand={parentCommand}
                trailing={
                  retries && (
                    <PastRetriesBadge
                      retries={retries}
                      hasFailed={entry?.resultType === 'failure'}
                      isExpanded={isRetryRowExpanded(
                        getRetryKey(combinedEntry) ?? '',
                      )}
                      onToggle={() => onToggleRetries(combinedEntry)}
                    />
                  )
                }
              />
            </ErrorBoundary>
          </div>
        );
      })}
    </div>
  );
});

const VirtualizedTimeline = memo(function VirtualizedTimeline({
  virtualItems,
  scrollMargin,
  totalSize,
  entriesWithoutInput,
  data,
  relatedEntriesByInvocation,
  referencedInvocations,
  isReferencedInvocationsError,
  focusInvocationId,
  activeRowIndex,
  childNow,
  shownInvocationIds,
}: {
  virtualItems: VirtualItem[];
  scrollMargin: number;
  totalSize: number;
  entriesWithoutInput: CombinedJournalEntry[];
  data?: ReturnType<typeof useGetInvocationsJournalWithInvocationsV2>['data'];
  relatedEntriesByInvocation: Map<string, Map<number, JournalEntryV2[]>>;
  referencedInvocations?: Record<
    string,
    components['schemas']['InvocationStatusResult'] | undefined
  >;
  isReferencedInvocationsError?: boolean;
  focusInvocationId?: string;
  activeRowIndex?: number;
  childNow?: number;
  shownInvocationIds: Set<string>;
}) {
  return (
    <div
      style={{
        height: totalSize,
        position: 'relative',
      }}
    >
      {virtualItems.map((virtualItem) => {
        const combinedEntry = entriesWithoutInput[virtualItem.index];
        if (!combinedEntry) return null;
        const { invocationId: entryInvocationId, entry } = combinedEntry;
        const relatedEntries =
          typeof entry?.index === 'number'
            ? relatedEntriesByInvocation
                .get(entryInvocationId)
                ?.get(entry.index)
            : undefined;
        const targetInvocationId =
          entry?.isPending &&
          isTargetInvocationEntry(entry) &&
          entry.type !== 'OneWayCall'
            ? entry.invocationId
            : undefined;
        const targetInvocation = targetInvocationId
          ? referencedInvocations?.[targetInvocationId]
          : undefined;
        const isTargetInvocationStatusPending =
          Boolean(targetInvocationId) &&
          !targetInvocation &&
          !isReferencedInvocationsError;
        const sendInvocationId = getSendInvocationId(entry);
        const sendChild = sendInvocationId
          ? referencedInvocations?.[sendInvocationId]
          : undefined;
        return (
          <TimelineRow
            key={virtualItem.key}
            entry={entry}
            invocation={data?.[entryInvocationId]}
            precomputedRelatedEntries={relatedEntries}
            targetInvocationStatus={targetInvocation?.status}
            isTargetInvocationStatusPending={isTargetInvocationStatusPending}
            sendChild={sendChild}
            childNow={sendChild ? childNow : undefined}
            isSendChildShown={
              sendInvocationId
                ? shownInvocationIds.has(sendInvocationId)
                : false
            }
            top={virtualItem.start - scrollMargin}
            height={virtualItem.size}
            isFocused={
              entryInvocationId === focusInvocationId ||
              virtualItem.index === activeRowIndex
            }
          />
        );
      })}
    </div>
  );
});

const TimelineRow = memo(function TimelineRow({
  entry,
  invocation,
  precomputedRelatedEntries,
  targetInvocationStatus,
  isTargetInvocationStatusPending,
  sendChild,
  childNow,
  isSendChildShown,
  top,
  height,
  isFocused,
}: {
  entry?: JournalEntryV2;
  invocation?: ReturnType<
    typeof useGetInvocationsJournalWithInvocationsV2
  >['data'][string];
  precomputedRelatedEntries?: JournalEntryV2[];
  targetInvocationStatus?: InvocationStatus;
  isTargetInvocationStatusPending?: boolean;
  sendChild?: SendChild;
  childNow?: number;
  isSendChildShown: boolean;
  top: number;
  height: number;
  isFocused: boolean;
}) {
  const { start } = useJournalTimelineContext();
  const hasSendTrail = drawsSendTrail(
    entry,
    invocation,
    precomputedRelatedEntries,
  );
  const hasProgress = hasEntryProgress(entry, invocation, start, hasSendTrail);
  return (
    <div
      className={virtualRowStyles({ isFocused, hasTimeline: hasProgress })}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height,
        transform: `translateY(${top}px)`,
      }}
    >
      {hasProgress && (
        <>
          <div
            className={timelineBaselineStyles({ isHidden: hasSendTrail })}
            style={TIMELINE_DRAW_WINDOW_INSET}
          />
          <EntryProgress
            entry={entry}
            invocation={invocation}
            precomputedRelatedEntries={precomputedRelatedEntries}
            targetInvocationStatus={targetInvocationStatus}
            isTargetInvocationStatusPending={isTargetInvocationStatusPending}
            drawSendTrail={hasSendTrail}
            isSendChildShown={isSendChildShown}
            sendChild={sendChild}
            childNow={childNow}
          />
        </>
      )}
    </div>
  );
});

function JournalPurgedMessage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <Icon name={IconName.Trash} className="h-5 w-5 text-subtle" />
      <div className="text-sm font-medium text-secondary">
        Journal was purged
      </div>
      <div className="max-w-md text-xs text-muted">
        Entries for this invocation are no longer available — the journal
        retention has elapsed or it was cleared.
      </div>
    </div>
  );
}

const hiddenEntriesChipStyles = tv({
  base: 'inline-flex shrink-0 cursor-help items-center gap-1 rounded-md bg-tint px-1.5 py-0.5 font-sans text-xs font-normal text-muted tabular-nums',
});

// Compact, passive indicator that some entries are hidden in the current view.
// It is not itself the reveal control — that's the Detailed dropdown. Its
// popover explains the count and, where there is no dropdown (embedded previews
// via `href`), offers a Show link to the full timeline with hidden revealed.
function HiddenEntriesChip({
  count,
  href,
  className,
}: {
  count: number;
  href?: string;
  className?: string;
}) {
  if (count <= 0) {
    return null;
  }

  return (
    <HoverTooltip
      placement="bottom"
      className={className}
      content={
        <div className="flex flex-col items-start gap-1">
          <span>
            {count}{' '}
            {formatPlurals(count, { one: 'entry is', other: 'entries are' })}{' '}
            hidden by the service/handler.
          </span>
          {href ? (
            <Link
              variant="icon"
              href={href}
              className="text-accent-subtle underline hover:text-on-accent"
            >
              Show in detailed view
            </Link>
          ) : (
            <span className="text-subtle">
              Switch to the Detailed view to see them.
            </span>
          )}
        </div>
      }
    >
      <span className={hiddenEntriesChipStyles()}>
        <Icon name={IconName.EyeOff} className="h-3 w-3 text-subtle" />
        {count}
      </span>
    </HoverTooltip>
  );
}
