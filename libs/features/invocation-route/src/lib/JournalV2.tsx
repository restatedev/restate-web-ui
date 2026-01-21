import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { Dispatch, lazy, Suspense, useCallback, useState } from 'react';
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
import { PortalProvider } from './Portals';
import { LifeCycleProgress, Units } from './LifeCycleProgress';
import { ErrorBoundary } from './ErrorBoundry';
import { tv } from '@restate/util/styles';
import { Retention } from './Retention';
import {
  RESTARTED_FROM_HEADER,
  useGetInvocationsJournalWithInvocationsV2,
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

const LazyPanel = lazy(() =>
  import('react-resizable-panels').then((m) => ({ default: m.Panel })),
);
const LazyPanelGroup = lazy(() =>
  import('react-resizable-panels').then((m) => ({
    default: m.PanelGroup,
  })),
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
  const [invocationIds, setInvocationIds] = useState([String(invocationId)]);
  const [isLive, setIsLive] = useState(true);
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
      if (query.state.status === 'success' && !query.state.data?.completed_at) {
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

  const combinedEntries = getCombinedJournal(invocationId, data)?.filter(
    ({ entry, parentCommand }) => {
      if (entry?.category === 'event' && entry?.type === 'Completion') {
        return false;
      }
      if (
        entry?.category === 'notification' &&
        entry?.type === 'CallInvocationId'
      ) {
        return false;
      }
      if (
        isCompact &&
        ((parentCommand && entry?.category === 'notification') ||
          entry?.type === 'Event: TransientError')
      ) {
        return false;
      }
      return true;
    },
  );

  const invocationApiError = apiError?.[invocationId];

  if (invocationApiError && showApiError) {
    return <ErrorBanner error={invocationApiError} className="rounded-2xl" />;
  }

  const dataUpdatedAt = allQueriesDataUpdatedAt[invocationId]!;

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
  const start = new Date(
    journalAndInvocationData?.created_at ??
      new Date(dataUpdatedAt).toISOString(),
  ).getTime();
  const areAllInvocationsCompleted = invocationIds.every(
    (id) => !data[id] || data[id]?.completed_at,
  );
  const end = Math.max(
    ...(combinedEntries?.map(({ entry }) =>
      entry?.end
        ? new Date(entry.end).getTime()
        : entry?.start
          ? new Date(entry.start).getTime()
          : -1,
    ) ?? []),
    !areAllInvocationsCompleted
      ? Math.max(
          ...Array.from(Object.values(allQueriesDataUpdatedAt).map(Number)),
        )
      : -1,
  );

  const inputEntry = combinedEntries?.find(
    (combinedEntry) =>
      combinedEntry.invocationId === invocationId &&
      combinedEntry.entry?.type === 'Input',
  )?.entry as Extract<JournalEntryV2, { type?: 'Input'; category?: 'command' }>;
  const restartedFromHeader = inputEntry?.headers?.find(
    ({ key }) => key === RESTARTED_FROM_HEADER,
  );

  const isRestartedFrom = Boolean(
    journalAndInvocationData.invoked_by === 'restart_as_new' ||
      restartedFromHeader,
  );
  const restartedFromValue =
    journalAndInvocationData?.restarted_from || restartedFromHeader?.value;

  const entriesElements = (
    <>
      <div className="z-10 box-border flex h-12 items-center rounded-tl-2xl rounded-bl-2xl border-b border-transparent bg-gray-100 shadow-xs ring-1 ring-black/5 last:border-none">
        <Input
          entry={inputEntry}
          invocation={data?.[invocationId]}
          className="w-full"
        />
      </div>
      {combinedEntries?.map(
        ({ invocationId, entry, depth, parentCommand }, index) => {
          const invocation = data?.[invocationId];
          if (entry?.type === 'Input') {
            return null;
          }

          return (
            <ErrorBoundary
              entry={entry}
              className="h-9"
              key={invocationId + entry?.category + entry?.type + index}
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
    </>
  );

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
              <div className="flex items-center gap-1.5 p-4 text-sm text-zinc-500">
                <Spinner className="h-4 w-4" />
                Loading…
              </div>
            }
          >
            <div className="absolute -top-9 flex h-9 w-full items-center">
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
                {!areAllInvocationsCompleted && (
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
            <div className="relative font-mono text-0.5xs">
              {withTimeline ? (
                <LazyPanelGroup
                  direction="horizontal"
                  className={'gap-0'}
                  style={{ overflow: 'visible' }}
                >
                  <LazyPanel
                    defaultSize={(1 - timelineWidth) * 100}
                    className="z-10 min-w-0"
                    style={{ overflow: 'visible' }}
                  >
                    <div className="relative rounded-2xl rounded-r-none border-0 border-r-0 border-white/50 bg-linear-to-b from-gray-50 to-white shadow-xs">
                      {entriesElements}
                    </div>
                  </LazyPanel>
                  <LazyPanelResizeHandle className="group relative hidden w-px items-center justify-center md:flex">
                    <div className="absolute top-3 bottom-3 left-0 w-px bg-transparent group-hover:w-[2px] group-hover:bg-blue-500" />
                  </LazyPanelResizeHandle>
                  <LazyPanel
                    defaultSize={timelineWidth * 100}
                    className="relative hidden md:block"
                    style={{ overflow: 'visible' }}
                  >
                    <Units
                      className="absolute inset-0"
                      invocation={journalAndInvocationData}
                    />
                    <div className="border border-transparent">
                      <LifeCycleProgress
                        className="h-12 px-2"
                        invocation={journalAndInvocationData}
                      />
                    </div>
                    {combinedEntries
                      ?.filter(({ entry }) => entry?.type !== 'Input')
                      .map(({ entry, invocationId }, index) => (
                        <TimelineContainer
                          invocationId={invocationId}
                          entry={entry}
                          invocation={data?.[invocationId]}
                          key={`${invocationId}-${entry?.category}-${entry?.type}-${index}`}
                        />
                      ))}
                  </LazyPanel>
                </LazyPanelGroup>
              ) : (
                <div className={className}>{entriesElements}</div>
              )}
            </div>
          </Suspense>
        </SnapshotTimeProvider>
      </JournalContextProvider>
    </PortalProvider>
  );
}

function TimelineContainer({
  entry,
  invocation,
}: {
  invocationId: string;
  entry?: JournalEntryV2;
  invocation?: ReturnType<
    typeof useGetInvocationsJournalWithInvocationsV2
  >['data'][string];
}) {
  return (
    <div className="relative h-9 w-full border-b border-transparent pr-2 pl-2 [&:not(:has(>*+*))]:hidden">
      <div className="absolute top-1/2 right-0 left-0 h-px border-spacing-10 -translate-y-px border-b border-dashed border-gray-300/70" />
      <EntryProgress entry={entry} invocation={invocation} />
    </div>
  );
}

function isExpandable(
  entry: JournalEntryV2,
): entry is
  | Extract<JournalEntryV2, { type?: 'Call'; category?: 'command' }>
  | Extract<
      JournalEntryV2,
      { type?: 'AttachInvocation'; category?: 'command' }
    > {
  return Boolean(
    entry.type &&
      ['Call', 'AttachInvocation'].includes(entry.type) &&
      entry.category === 'command',
  );
}

export type CombinedJournalEntry = {
  invocationId: string;
  entry?: JournalEntryV2;
  depth: number;
  parentCommand?: JournalEntryV2;
};

function getCombinedJournal(
  invocationId: string,
  data?: ReturnType<typeof useGetInvocationsJournalWithInvocationsV2>['data'],
  depth = 0,
): CombinedJournalEntry[] | undefined {
  const entries = data?.[invocationId]?.journal?.entries;

  if (entries?.length === 0) {
    return [
      {
        invocationId,
        depth,
      },
    ];
  }

  const combinedEntries = entries
    ?.map((entry) => {
      let parentCommand: JournalEntryV2 | undefined;
      if (entry.category !== 'command' && typeof entry.index === 'number') {
        parentCommand = entries.find(
          (e) =>
            e.category === 'command' &&
            (e.relatedIndexes?.includes(entry.index as number) ||
              ('relatedCommandIndex' in entry &&
                typeof entry.relatedCommandIndex === 'number' &&
                e.commandIndex === entry.relatedCommandIndex)),
        );
      }

      if (isExpandable(entry)) {
        const callInvocationId = String(entry.invocationId);
        return [
          {
            invocationId,
            entry,
            depth,
            parentCommand,
          },
          ...(getCombinedJournal(callInvocationId, data, depth + 1)?.flat() ??
            []),
        ].flat();
      } else {
        return {
          invocationId,
          entry,
          depth,
          parentCommand,
        };
      }
    })
    .flat();

  return combinedEntries;
}
