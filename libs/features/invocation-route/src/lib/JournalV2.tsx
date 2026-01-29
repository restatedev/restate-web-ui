import { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import { Dispatch, lazy, Suspense, useCallback, useRef, useState } from 'react';
import type { VirtualItem } from '@tanstack/react-virtual';
import { InvocationId } from './InvocationId';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
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
import { PortalProvider, ViewportSelectorPortalTarget } from './Portals';
import { LifeCycleProgress } from './LifeCycleProgress';
import { HeaderUnits } from './Units';
import { ScrollableTimeline } from './ScrollableTimeline';
import { ErrorBoundary } from './ErrorBoundry';
import { tv } from '@restate/util/styles';
import { Retention } from './Retention';
import {
  RESTARTED_FROM_HEADER,
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
import {
  CombinedJournalEntry,
  useProcessedJournal,
} from './useProcessedJournal';

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

  const start = journalAndInvocationData
    ? new Date(
        journalAndInvocationData?.created_at ??
          new Date(dataUpdatedAt).toISOString(),
      ).getTime()
    : 0;
  const areAllInvocationsCompleted = invocationIds.every(
    (id) => !data[id] || data[id]?.completed_at,
  );
  const end = journalAndInvocationData
    ? Math.max(
        ...entriesWithoutInputUnfiltered.map(({ entry }) =>
          entry?.end
            ? new Date(entry.end).getTime()
            : entry?.start
              ? new Date(entry.start).getTime()
              : -1,
        ),
        !areAllInvocationsCompleted
          ? Math.max(
              ...Array.from(Object.values(allQueriesDataUpdatedAt).map(Number)),
            )
          : -1,
      )
    : 0;

  const entriesWithoutInput = entriesWithoutInputUnfiltered;

  const virtualizer = useWindowVirtualizer({
    count: entriesWithoutInput.length,
    estimateSize: () => 36,
    overscan: 100,
    scrollMargin: 0,
    getItemKey: (index) => {
      const entry = entriesWithoutInput[index];
      return entry
        ? `${entry.invocationId}-${entry.entry?.index}-${entry.entry?.type}`
        : index;
    },
  });

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

  const firstPendingCommandIndex = journalAndInvocationData.completed_at
    ? journalAndInvocationData.journal?.entries?.find(
        (entry) => entry.category === 'command' && entry.isPending,
      )?.index
    : undefined;

  return (
    <PortalProvider>
      <JournalContextProvider
        invocationIds={invocationIds}
        addInvocationId={addInvocationId}
        removeInvocationId={removeInvocationId}
        start={start}
        end={end}
        dataUpdatedAt={dataUpdatedAt}
        isPending={isPending}
        error={apiError}
        isLive={!areAllInvocationsCompleted && isLive}
        isCompact={isCompact}
        firstPendingCommandIndex={firstPendingCommandIndex}
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
              <div className="sticky top-26 z-20 flex h-9 w-full items-center">
                <div className="flex flex-col">
                  <div className="relative flex h-full w-full items-center gap-1.5">
                    <div className="absolute left-2.5 h-2 w-2 rounded-full bg-zinc-300">
                      <div className="absolute top-full left-1/2 h-8 w-px -translate-x-1/2 border border-dashed border-zinc-300" />
                    </div>
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
                  <div className="pb-4 pl-6">
                    <Retention
                      invocation={journalAndInvocationData}
                      type="journal"
                      prefixForCompletion="retention "
                      prefixForInProgress="retained "
                      className="text-xs"
                    />
                  </div>
                </div>
                <div className="z-10 ml-auto flex h-full flex-row items-center justify-end gap-1 rounded-lg bg-linear-to-l from-gray-100 via-gray-100 to-gray-100/0 pl-10">
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
                          selectedItems={isCompact ? ['compact'] : ['expanded']}
                          onSelect={(key) => setIsCompact?.(key === 'compact')}
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
                  {!areAllInvocationsCompleted && setIsLive && (
                    <Button
                      variant="icon"
                      className={liveStyles({ isLive })}
                      onClick={() => setIsLive((v) => !v)}
                    >
                      <div className="">Live</div>
                      {isLive && <Indicator status="INFO" className="mb-0.5" />}
                      {!isLive && (
                        <Icon
                          name={IconName.Play}
                          className="mb-px h-2.5 w-2.5 fill-current"
                        />
                      )}
                    </Button>
                  )}
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
              </div>
            )}
            {withTimeline ? (
              <div
                ref={listRef}
                className="relative isolate rounded-b-2xl bg-gray-100 font-mono text-0.5xs [clip-path:inset(-2.5rem_0_0_0_round_0_0_1rem_1rem)]"
              >
                <LazyPanelGroup
                  direction="horizontal"
                  style={{ overflow: 'visible' }}
                  className="rounded-2xl border shadow-xs"
                >
                  {/* Left panel */}
                  <LazyPanel
                    defaultSize={(1 - timelineWidth) * 100}
                    minSize={20}
                    className="z-[2] grid min-w-0"
                    style={{
                      overflow: 'visible',
                      minHeight: virtualizer.getTotalSize() + 48,
                      gridTemplateColumns: '1fr',
                      gridTemplateRows: '1fr',
                    }}
                  >
                    {/* Sticky background - prevents repaint lag */}
                    <div className="sticky top-0 z-[-1] col-start-1 row-start-1 h-full max-h-[calc(100vh+2rem)] rounded-2xl border-0 border-r-0 border-white/50 bg-linear-to-b from-gray-50 to-white shadow-xs md:rounded-r-none" />
                    {/* Content */}
                    <div
                      className="z-[2] col-start-1 row-start-1 min-w-0"
                      style={{ minHeight: virtualizer.getTotalSize() + 48 }}
                    >
                      <div className="sticky top-36 z-20 box-border flex h-12 items-center rounded-tl-2xl rounded-r-2xl rounded-bl-2xl border-b border-transparent bg-gray-100 shadow-xs ring-1 ring-gray-300 last:border-none md:rounded-r-none">
                        <Input
                          entry={typedInputEntry}
                          invocation={data?.[invocationId]}
                          className="w-full rounded-r-2xl! [--rounded-radius-right:15px] md:rounded-r-none! md:[--rounded-radius-right:0px] [&&&>*:last-child>*]:rounded-r-2xl! md:[&&&>*:last-child>*]:rounded-r-none!"
                        />
                      </div>
                      <VirtualizedEntries
                        virtualItems={virtualizer.getVirtualItems()}
                        totalSize={virtualizer.getTotalSize()}
                        entriesWithoutInput={entriesWithoutInput}
                        data={data}
                      />
                    </div>
                  </LazyPanel>
                  <LazyPanelResizeHandle className="group relative z-10 -mx-2 hidden w-4 cursor-col-resize items-center justify-center md:flex">
                    <div className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 cursor-col-resize bg-transparent group-hover:w-[2px] group-hover:bg-blue-500" />
                  </LazyPanelResizeHandle>
                  {/* Right panel - grid container for overlapping Units */}
                  <LazyPanel
                    defaultSize={timelineWidth * 100}
                    className="relative hidden md:grid"
                    minSize={20}
                    style={{
                      overflow: 'visible',
                      minHeight: virtualizer.getTotalSize() + 48,
                      gridTemplateColumns: '1fr',
                      gridTemplateRows: '1fr',
                    }}
                  >
                    {/* Sticky background - prevents repaint lag */}
                    <div className="sticky top-0 z-[-1] col-start-1 row-start-1 h-full max-h-[calc(100vh+2rem)] rounded-br-2xl bg-gray-100" />
                    {/* Sticky header with HeaderUnits and LifeCycleProgress */}
                    <div className="sticky top-36 z-[2] col-start-1 row-start-1 h-12">
                      <HeaderUnits
                        className="pointer-events-none absolute inset-0"
                        start={start}
                        end={end}
                      />
                      <div className="relative -my-px h-[calc(100%+2px)] rounded-r-2xl border border-gray-300 border-l-transparent shadow-xs">
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
                        <ViewportSelectorPortalTarget className="absolute inset-0 z-10" />
                      </div>
                    </div>
                    <div className="sticky top-36 right-0 z-[1] col-start-1 row-start-1 h-12 rounded-r-2xl border border-t-2 border-white bg-gray-100 shadow-xs" />

                    {/* Scrollable timeline content with Units overlay */}
                    <ScrollableTimeline
                      className="col-start-1 row-start-1 pt-[calc(3rem+2px)]"
                      style={{ minHeight: virtualizer.getTotalSize() + 48 }}
                      start={start}
                      end={end}
                      dataUpdatedAt={dataUpdatedAt}
                      cancelEvent={
                        lifecycleDataByInvocation.get(invocationId)?.cancelEvent
                      }
                    >
                      <VirtualizedTimeline
                        virtualItems={virtualizer.getVirtualItems()}
                        totalSize={virtualizer.getTotalSize()}
                        entriesWithoutInput={entriesWithoutInput}
                        data={data}
                        relatedEntriesByInvocation={relatedEntriesByInvocation}
                      />
                    </ScrollableTimeline>
                  </LazyPanel>
                </LazyPanelGroup>
              </div>
            ) : (
              <div className={className}>
                <div className="z-10 box-border flex h-12 items-center rounded-tl-2xl rounded-bl-2xl border-b border-transparent bg-gray-100 shadow-xs ring-1 ring-gray-300 last:border-none">
                  <Input
                    entry={typedInputEntry}
                    invocation={data?.[invocationId]}
                    className="w-full"
                  />
                </div>
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
      </JournalContextProvider>
    </PortalProvider>
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
            className="animate-row-fade-in"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualItem.size,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ErrorBoundary entry={entry} className="sticky top-36 h-9">
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
            className="animate-row-fade-in"
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

function TimelineContainer({
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
}
