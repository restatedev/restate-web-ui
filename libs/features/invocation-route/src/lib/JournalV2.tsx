import type {
  components,
  JournalEntryV2,
} from '@restate/data-access/admin-api-spec';
import {
  Dispatch,
  lazy,
  memo,
  Suspense,
  useCallback,
  useRef,
  useState,
} from 'react';
import type { VirtualItem } from '@tanstack/react-virtual';
import { InvocationId } from './InvocationId';
import { getDuration, SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';
import { Button } from '@restate/ui/button';
import { HoverTooltip } from '@restate/ui/tooltip';
import { useRestateContext } from '@restate/features/restate-context';
import { ErrorBanner } from '@restate/ui/error';
import { JournalContextProvider } from './JournalContext';
import { Indicator, Spinner } from '@restate/ui/loading';
import { Entry } from './Entry';
import { Input } from './entries/Input';
import { EntryProgress } from './EntryProgress';
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
import { tv } from '@restate/util/styles';
import { Retention } from './Retention';
import {
  RESTARTED_FROM_HEADER,
  useWarmInvocationStatusDetails,
  useGetInvocationsJournalWithInvocationsV2,
  useGetJournalEntryPayloads,
  useListSubscriptions,
} from '@restate/data-access/admin-api-hooks';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { formatDurations } from '@restate/util/intl';
import {
  TimelineEngineProvider,
  useTimelineEngineContext,
} from '@restate/ui/timeline-zoom';
import {
  ContentPanelHeader,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui/content-panel';
import {
  CombinedJournalEntry,
  useProcessedJournal,
} from './useProcessedJournal';
import { useContainerWidth } from './useContainerWidth';

const LazyPanel = lazy(() =>
  import('react-resizable-panels').then((m) => ({ default: m.Panel })),
);
const LazyPanelGroup = lazy(() =>
  import('react-resizable-panels').then((m) => ({ default: m.PanelGroup })),
);
const LazyPanelResizeHandle = lazy(() =>
  import('react-resizable-panels').then((m) => ({
    default: m.PanelResizeHandle,
  })),
);

const liveStyles = tv({
  base: 'flex items-center gap-1 rounded-sm px-2 text-xs font-semibold text-gray-500 uppercase',
  variants: {
    isLive: {
      true: '',
      false: '',
    },
  },
});

const compactStyles = tv({
  base: 'py-0.5 pl-1.5 text-xs font-medium',
  variants: {
    isCompact: {
      true: '',
      false: '',
    },
  },
});

const LIVE_EDGE_THRESHOLD_MS = 500;

type ReferencedInvocationEntry = Extract<
  JournalEntryV2,
  {
    category?: 'command';
    type?: 'Call' | 'OneWayCall' | 'AttachInvocation';
  }
>;

function isReferencedInvocationEntry(
  entry?: JournalEntryV2,
): entry is ReferencedInvocationEntry {
  return (
    entry?.category === 'command' &&
    (entry.type === 'Call' ||
      entry.type === 'OneWayCall' ||
      entry.type === 'AttachInvocation')
  );
}

function getReferencedInvocationIds(
  data?: ReturnType<typeof useGetInvocationsJournalWithInvocationsV2>['data'],
) {
  return [
    ...new Set(
      Object.values(data ?? {}).flatMap(
        (invocation) =>
          invocation?.journal?.entries?.flatMap((entry) =>
            isReferencedInvocationEntry(entry) && entry.invocationId
              ? [entry.invocationId]
              : [],
          ) ?? [],
      ),
    ),
  ];
}

function hasNonCompletedReferencedInvocations(
  invocationIds: string[],
  invocations?: Record<
    string,
    components['schemas']['InvocationStatusResult'] | undefined
  >,
) {
  return invocationIds.some((invocationId) => {
    const invocation = invocations?.[invocationId];
    return (
      invocation?.status !== 'succeeded' && invocation?.status !== 'failed'
    );
  });
}

export function JournalV2({
  invocationId,
  className,
  timelineWidth = 0.5,
  showApiError = true,
  withTimeline = true,
  isCompact = true,
  setIsCompact,
}: {
  invocationId: string;
  className?: string;
  timelineWidth?: number;
  showApiError?: boolean;
  withTimeline?: boolean;
  isCompact?: boolean;
  setIsCompact?: Dispatch<React.SetStateAction<boolean>>;
}) {
  const [isLive, setIsLive] = useState(true);
  const [invocationIds, setInvocationIds] = useState([String(invocationId)]);
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
        query.state.status === 'success' &&
        (!query.state.data?.completed_at ||
          query.state.data?.journal_commands_size !==
            query.state.data?.journal?.entries?.filter(
              (e) => e.category === 'command',
            ).length) &&
        isLive
      ) {
        return 1000;
      } else {
        return false;
      }
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
  const { data: subscriptions } = useListSubscriptions();
  const referencedInvocationIds = getReferencedInvocationIds(data);
  useWarmInvocationStatusDetails(referencedInvocationIds, invocationId, {
    refetchOnMount: true,
    staleTime: 0,
    refetchInterval(query) {
      if (
        isLive &&
        (query.state.status !== 'success' ||
          hasNonCompletedReferencedInvocations(
            referencedInvocationIds,
            query.state.data?.invocations,
          ))
      ) {
        return 1000;
      }

      return false;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });

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
  const listRef = useRef<HTMLDivElement>(null);
  const startDateOverlayRef = useRef<HTMLDivElement>(null);
  const headerLayoutRef = useRef<HTMLDivElement>(null);

  const {
    entriesWithoutInput: allEntriesWithoutInput,
    inputEntry,
    relatedEntriesByInvocation,
    lifecycleDataByInvocation,
  } = useProcessedJournal(invocationId, data, isCompact);
  const { data: inputData } = useGetJournalEntryPayloads(invocationId, 0, {
    enabled: false,
  });

  const MAX_ENTRIES_WITHOUT_TIMELINE = 50;
  const hasMoreEntries =
    !withTimeline &&
    allEntriesWithoutInput.length > MAX_ENTRIES_WITHOUT_TIMELINE;
  const entriesWithoutInputUnfiltered = withTimeline
    ? allEntriesWithoutInput
    : allEntriesWithoutInput.slice(0, MAX_ENTRIES_WITHOUT_TIMELINE);

  const invocationApiError = apiError?.[invocationId];
  const dataUpdatedAt = allQueriesDataUpdatedAt[invocationId]!;
  const latestDataUpdatedAt = Math.max(
    dataUpdatedAt,
    ...Object.values(allQueriesDataUpdatedAt).map(Number),
  );

  const start = journalAndInvocationData
    ? new Date(
        journalAndInvocationData?.created_at ??
          new Date(dataUpdatedAt).toISOString(),
      ).getTime()
    : 0;
  const areAllInvocationsCompleted = invocationIds.every(
    (id) => !data[id] || data[id]?.completed_at,
  );
  const maxEntryTimestamp = Math.max(
    ...entriesWithoutInputUnfiltered.map(({ entry }) =>
      entry?.end
        ? new Date(entry.end).getTime()
        : entry?.start
          ? new Date(entry.start).getTime()
          : -1,
    ),
  );
  const end = journalAndInvocationData
    ? Math.max(
        maxEntryTimestamp,
        !areAllInvocationsCompleted ? latestDataUpdatedAt : -1,
      )
    : 0;

  const entriesWithoutInput = entriesWithoutInputUnfiltered;

  const virtualizer = useWindowVirtualizer({
    count: entriesWithoutInput.length,
    estimateSize: () => 36,
    overscan: 24,
    scrollMargin: 0,
    getItemKey: (index) => {
      const entry = entriesWithoutInput[index];
      return entry
        ? `${entry.invocationId}-${entry.entry?.index}-${entry.entry?.type}`
        : index;
    },
  });
  const totalSize = virtualizer.getTotalSize();
  const virtualItems = virtualizer.getVirtualItems();
  const handlePanelLayout = useCallback((sizes: number[]) => {
    const nextTimelinePanelSize = sizes[1];
    if (
      nextTimelinePanelSize === undefined ||
      !Number.isFinite(nextTimelinePanelSize)
    ) {
      return;
    }

    if (startDateOverlayRef.current) {
      startDateOverlayRef.current.style.marginLeft = `${100 - nextTimelinePanelSize}%`;
      startDateOverlayRef.current.style.width = `${nextTimelinePanelSize}%`;
    }

    if (headerLayoutRef.current) {
      headerLayoutRef.current.style.gridTemplateColumns = `${100 - nextTimelinePanelSize}% ${nextTimelinePanelSize}%`;
    }
  }, []);

  const [containerWidthRef, containerWidthPx] = useContainerWidth();

  if (invocationApiError && showApiError) {
    return <ErrorBanner error={invocationApiError} className="rounded-2xl" />;
  }

  if (isPending[invocationId]) {
    return (
      <div className="flex items-center gap-1.5 px-4 py-2 text-sm text-zinc-500">
        <Spinner className="h-4 w-4" />
        Loading…
      </div>
    );
  }

  if (!journalAndInvocationData) {
    return null;
  }

  const typedInputEntry = inputEntry as
    | Extract<JournalEntryV2, { type?: 'Input'; category?: 'command' }>
    | undefined;
  const restartedFromHeader = (
    inputData?.headers || typedInputEntry?.headers
  )?.find(({ key }: { key: string }) => key === RESTARTED_FROM_HEADER);

  const isRestartedFrom = Boolean(
    journalAndInvocationData.invoked_by === 'restart_as_new' ||
    restartedFromHeader,
  );
  const restartedFromValue =
    journalAndInvocationData?.restarted_from || restartedFromHeader?.value;

  return (
    <PortalProvider>
      <TimelineEngineProvider
        actualStart={start}
        actualEnd={end}
        authoritativeNowMs={latestDataUpdatedAt}
        areAllCompleted={areAllInvocationsCompleted}
        isLiveEnabled={isLive}
        containerWidthPx={containerWidthPx}
      >
        <TimelineEngineJournalBridge
          invocationIds={invocationIds}
          addInvocationId={addInvocationId}
          removeInvocationId={removeInvocationId}
          dataUpdatedAt={dataUpdatedAt}
          isPending={isPending}
          error={apiError}
          areAllInvocationsCompleted={areAllInvocationsCompleted}
          isLive={isLive}
          isCompact={isCompact}
        >
          <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
            <Suspense
              fallback={
                <div className="mt-4 flex items-center gap-1.5 p-4 text-sm text-zinc-500">
                  <Spinner className="h-4 w-4" />
                  Loading…
                </div>
              }
            >
              {withTimeline && (
                <ContentPanelToolbar className="relative items-end! pr-5 pl-3">
                  <div className="relative flex flex-col">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute top-5.5 bottom-0 left-3.5 w-px -translate-x-1/2 border-l border-dashed border-zinc-300"
                    />
                    <div className="relative flex h-full w-full items-center gap-1.5">
                      <div className="absolute left-2.5 h-2 w-2 rounded-full bg-zinc-300" />
                      <div className="shrink-0 pl-6 text-xs font-semibold text-gray-400 uppercase">
                        {isRestartedFrom ? 'Restarted from' : 'Invoked by'}
                      </div>
                      {journalAndInvocationData?.invoked_by === 'ingress' &&
                      !isRestartedFrom ? (
                        <div className="text-xs font-medium">Ingress</div>
                      ) : journalAndInvocationData?.invoked_by_id ? (
                        <InvocationId
                          id={journalAndInvocationData?.invoked_by_id}
                          className="max-w-[20ch] min-w-0 text-0.5xs font-semibold"
                        />
                      ) : restartedFromValue ? (
                        <InvocationId
                          id={restartedFromValue}
                          className="max-w-[20ch] min-w-0 text-0.5xs font-semibold"
                        />
                      ) : journalAndInvocationData?.invoked_by ===
                        'subscription' ? (
                        <div className="text-xs font-medium">
                          {subscriptions?.subscriptions?.find(
                            (sub) =>
                              sub.id ===
                              journalAndInvocationData?.invoked_by_subscription_id,
                          )?.source ||
                            journalAndInvocationData?.invoked_by_subscription_id}
                        </div>
                      ) : null}
                    </div>
                    <div className="pb-1 pl-6">
                      <Retention
                        invocation={journalAndInvocationData}
                        type="journal"
                        prefixForCompletion="retention "
                        prefixForInProgress="retained "
                        className="text-xs"
                      />
                    </div>
                  </div>
                  <div className="z-10 ml-auto flex flex-row items-center justify-end gap-1 self-end rounded-lg bg-linear-to-l from-gray-100 via-gray-100 to-gray-100/0 pb-1 pl-10">
                    <Dropdown>
                      <DropdownTrigger>
                        <Button
                          variant="icon"
                          onClick={() => setIsCompact?.((v) => !v)}
                          className={compactStyles({ isCompact })}
                        >
                          {isCompact ? 'Compact' : 'Detailed'}
                          <Icon
                            name={IconName.ChevronsUpDown}
                            className="ml-1 h-3.5 w-3.5"
                          />
                        </Button>
                      </DropdownTrigger>
                      <DropdownPopover>
                        <DropdownSection title="View mode">
                          <DropdownMenu
                            selectable
                            selectedItems={
                              isCompact ? ['compact'] : ['expanded']
                            }
                            onSelect={(key) =>
                              setIsCompact?.(key === 'compact')
                            }
                          >
                            <DropdownItem value="compact">
                              <div>
                                <div>Compact</div>
                                <div className="text-0.5xs opacity-70">
                                  Actions only
                                </div>
                              </div>
                            </DropdownItem>
                            <DropdownItem value="expanded">
                              <div>
                                <div>Detailed</div>
                                <div className="text-0.5xs opacity-70">
                                  Include transient errors and completions
                                </div>
                              </div>
                            </DropdownItem>
                          </DropdownMenu>
                        </DropdownSection>
                      </DropdownPopover>
                    </Dropdown>
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
                    <HoverTooltip content="Introspect">
                      <Link
                        variant="icon"
                        href={`${baseUrl}/introspection?query=SELECT id, index, appended_at, entry_type, name, entry_lite_json AS metadata FROM sys_journal WHERE id = '${journalAndInvocationData?.id}'`}
                        target="_blank"
                      >
                        <Icon name={IconName.ScanSearch} className="h-4 w-4" />
                      </Link>
                    </HoverTooltip>
                  </div>
                </ContentPanelToolbar>
              )}
              {withTimeline && (
                <ContentPanelHeader className="font-mono text-0.5xs">
                  <div className="relative h-12 w-full">
                    <div className="pointer-events-none absolute inset-0 z-30 hidden md:block">
                      <div
                        ref={startDateOverlayRef}
                        className="h-full"
                        style={{
                          marginLeft: `${(1 - timelineWidth) * 100}%`,
                          width: `${timelineWidth * 100}%`,
                        }}
                      >
                        <StartDateTimeUnit start={start} />
                      </div>
                    </div>
                    <div
                      ref={headerLayoutRef}
                      className="h-full w-full md:grid"
                      style={{
                        gridTemplateColumns: `${(1 - timelineWidth) * 100}% ${timelineWidth * 100}%`,
                      }}
                    >
                      <div className="flex h-full min-w-0 items-center">
                        <Input
                          entry={typedInputEntry}
                          invocation={data?.[invocationId]}
                        />
                      </div>
                      <div
                        ref={containerWidthRef}
                        className="relative hidden min-w-0 md:block"
                      >
                        <div className="relative h-full overflow-hidden rounded-tr-2xl">
                          <LifeCycleProgress
                            className="h-12 px-2"
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
                          <ViewportSelectorPortalTarget className="absolute right-0 bottom-1/2 left-0 z-10 h-6 translate-y-1/2" />
                        </div>
                      </div>
                    </div>
                  </div>
                </ContentPanelHeader>
              )}
              {withTimeline ? (
                <div className="relative flex min-h-0 flex-1">
                  <div
                    ref={listRef}
                    className="relative isolate flex min-h-0 flex-1 flex-col font-mono text-0.5xs"
                  >
                    <LazyPanelGroup
                      direction="horizontal"
                      onLayout={handlePanelLayout}
                      style={{ overflow: 'visible' }}
                      className="min-h-full flex-1"
                    >
                      {/* Left panel */}
                      <LazyPanel
                        defaultSize={(1 - timelineWidth) * 100}
                        minSize={20}
                        className="z-[2] grid min-w-0"
                        style={{
                          overflow: 'visible',
                          minHeight: totalSize,
                          gridTemplateColumns: '1fr',
                          gridTemplateRows: '1fr',
                        }}
                      >
                        {/* Content */}
                        <ContentPanelSection
                          className="z-[2] col-start-1 row-start-1 min-w-0 border-r"
                          style={{ minHeight: totalSize }}
                        >
                          <VirtualizedEntries
                            virtualItems={virtualItems}
                            totalSize={totalSize}
                            entriesWithoutInput={entriesWithoutInput}
                            data={data}
                          />
                        </ContentPanelSection>
                      </LazyPanel>
                      <LazyPanelResizeHandle className="group relative z-10 mx-[-5px] hidden w-2.5 cursor-col-resize items-center justify-center md:flex">
                        <div className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 cursor-col-resize bg-transparent group-hover:w-[2px] group-hover:bg-blue-500" />
                      </LazyPanelResizeHandle>
                      {/* Right panel - grid container for overlapping Units */}
                      <LazyPanel
                        defaultSize={timelineWidth * 100}
                        className="relative hidden overflow-x-clip bg-black/3 md:grid"
                        minSize={20}
                        style={{
                          overflow: 'visible',
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
                          fadeClassName="from-gray-100"
                        >
                          <ScrollableTimeline
                            cancelEvent={
                              lifecycleDataByInvocation.get(invocationId)
                                ?.cancelEvent
                            }
                          >
                            <VirtualizedTimeline
                              virtualItems={virtualItems}
                              totalSize={totalSize}
                              entriesWithoutInput={entriesWithoutInput}
                              data={data}
                              relatedEntriesByInvocation={
                                relatedEntriesByInvocation
                              }
                            />
                          </ScrollableTimeline>
                        </ContentPanelSection>
                      </LazyPanel>
                    </LazyPanelGroup>
                  </div>
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
                          key={`${entryInvocationId}-${entry?.category}-${entry?.type}-${index}`}
                        >
                          <Entry
                            invocation={invocation}
                            entry={entry}
                            depth={depth}
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
                      className="flex items-center justify-center gap-1 py-3 text-xs text-blue-600 hover:text-blue-700"
                    >
                      View all entries
                      <Icon name={IconName.ChevronRight} className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}
            </Suspense>
          </SnapshotTimeProvider>
        </TimelineEngineJournalBridge>
      </TimelineEngineProvider>
    </PortalProvider>
  );
}

function TimelineEngineJournalBridge({
  invocationIds,
  addInvocationId,
  removeInvocationId,
  dataUpdatedAt,
  isPending,
  error,
  areAllInvocationsCompleted,
  isLive,
  isCompact,
  children,
}: {
  invocationIds: string[];
  addInvocationId: (id: string) => void;
  removeInvocationId: (id: string) => void;
  dataUpdatedAt: number;
  isPending: Record<string, boolean | undefined>;
  error?: Record<string, Error | null | undefined>;
  areAllInvocationsCompleted: boolean;
  isLive: boolean;
  isCompact: boolean;
  children: React.ReactNode;
}) {
  const engine = useTimelineEngineContext();
  return (
    <JournalContextProvider
      invocationIds={invocationIds}
      addInvocationId={addInvocationId}
      removeInvocationId={removeInvocationId}
      start={engine.coordinateStart}
      end={engine.coordinateEnd}
      dataUpdatedAt={dataUpdatedAt}
      isPending={isPending}
      error={error}
      isLive={!areAllInvocationsCompleted && isLive}
      isCompact={isCompact}
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

function VirtualizedEntries({
  virtualItems,
  totalSize,
  entriesWithoutInput,
  data,
}: {
  virtualItems: VirtualItem[];
  totalSize: number;
  entriesWithoutInput: CombinedJournalEntry[];
  data?: ReturnType<typeof useGetInvocationsJournalWithInvocationsV2>['data'];
}) {
  return (
    <div
      className="overflow-clip"
      style={{
        height: totalSize,
        position: 'relative',
      }}
    >
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

        return (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualItem.size,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ErrorBoundary
              entry={entry}
              className="sticky top-[var(--cp-content-top,0px)] h-9"
            >
              <Entry
                invocation={invocation}
                entry={entry}
                depth={depth}
                parentCommand={parentCommand}
              />
            </ErrorBoundary>
          </div>
        );
      })}
    </div>
  );
}

function VirtualizedTimeline({
  virtualItems,
  totalSize,
  entriesWithoutInput,
  data,
  relatedEntriesByInvocation,
}: {
  virtualItems: VirtualItem[];
  totalSize: number;
  entriesWithoutInput: CombinedJournalEntry[];
  data?: ReturnType<typeof useGetInvocationsJournalWithInvocationsV2>['data'];
  relatedEntriesByInvocation: Map<string, Map<number, JournalEntryV2[]>>;
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

        return (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualItem.size,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <TimelineContainer
              invocationId={entryInvocationId}
              entry={entry}
              invocation={data?.[entryInvocationId]}
              precomputedRelatedEntries={relatedEntries}
            />
          </div>
        );
      })}
    </div>
  );
}

const TimelineContainer = memo(function TimelineContainer({
  entry,
  invocation,
  precomputedRelatedEntries,
}: {
  invocationId: string;
  entry?: JournalEntryV2;
  invocation?: ReturnType<
    typeof useGetInvocationsJournalWithInvocationsV2
  >['data'][string];
  precomputedRelatedEntries?: JournalEntryV2[];
}) {
  return (
    <div className="relative h-9 w-full border-b border-transparent pr-2 pl-2 [&:not(:has(>*+*))]:hidden">
      <div className="absolute top-1/2 right-0 left-0 h-px border-spacing-10 -translate-y-px border-b border-dashed border-gray-300/70" />
      <EntryProgress
        entry={entry}
        invocation={invocation}
        precomputedRelatedEntries={precomputedRelatedEntries}
      />
    </div>
  );
});
