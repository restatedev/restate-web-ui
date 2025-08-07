import {
  JournalEntryV2,
  useGetInvocationsJournalWithInvocationsV2,
} from '@restate/data-access/admin-api';
import { lazy, Suspense, useCallback, useState } from 'react';
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
import { getTimelineId, PortalProvider, usePortals } from './Portals';
import { LifeCycleProgress, Units } from './LifeCycleProgress';
import { ErrorBoundary } from './ErrorBoundry';
import { tv } from '@restate/util/styles';

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

export function JournalV2({
  invocationId,
  className,
  timelineWidth = 0.5,
  showApiError = true,
  withTimeline = true,
  isLive = false,
  setIsLive,
}: {
  invocationId: string;
  className?: string;
  timelineWidth?: number;
  showApiError?: boolean;
  withTimeline?: boolean;
  isLive?: boolean;
  setIsLive?: (value: boolean) => void;
}) {
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
        isLive &&
        query.state.status === 'success' &&
        !query.state.data?.completed_at
      ) {
        return 1000;
      } else {
        return false;
      }
    },
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

  const combinedEntries = getCombinedJournal(invocationId, data)?.filter(
    ({ entry }) => withTimeline || entry?.category === 'command',
  );

  const invocationApiError = apiError?.[invocationId];

  if (invocationApiError && showApiError) {
    return <ErrorBanner error={invocationApiError} />;
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
    (id) => data[id]?.completed_at,
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

  const entriesElements = (
    <>
      <div className="z-10 box-border flex h-12 items-center rounded-bl-2xl border-b border-transparent bg-gray-100 shadow-xs ring-1 ring-black/5 last:border-none">
        <Input
          entry={
            combinedEntries?.find(
              (combinedEntry) =>
                combinedEntry.invocationId === invocationId &&
                combinedEntry.entry?.type === 'Input',
            )?.entry as Extract<
              JournalEntryV2,
              { type?: 'Input'; category?: 'command' }
            >
          }
          invocation={data?.[invocationId]}
          className="w-full"
        />
      </div>
      {combinedEntries?.map(({ invocationId, entry, depth }, index) => {
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
            <Entry invocation={invocation} entry={entry} depth={depth} />
          </ErrorBoundary>
        );
      })}
    </>
  );

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
        isLive={isLive}
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
              <div className="relative flex h-full w-full items-center gap-1.5">
                <div className="absolute left-2.5 h-2 w-2 rounded-full bg-zinc-300">
                  <div className="absolute top-full left-1/2 h-3.5 w-px -translate-x-1/2 border border-dashed border-zinc-300" />
                </div>
                <div className="shrink-0 pl-6 text-xs font-semibold text-gray-400 uppercase">
                  Invoked by
                </div>
                {journalAndInvocationData?.invoked_by === 'ingress' ? (
                  <div className="text-xs font-medium">Ingress</div>
                ) : journalAndInvocationData?.invoked_by_id ? (
                  <InvocationId
                    id={journalAndInvocationData?.invoked_by_id}
                    className="max-w-[20ch] min-w-0 text-0.5xs font-semibold"
                  />
                ) : null}
              </div>
              <div className="z-10 ml-auto flex h-full flex-row items-center justify-end gap-1 rounded-lg bg-linear-to-l from-gray-100 via-gray-100 to-gray-100/0 pl-10">
                {!areAllInvocationsCompleted && setIsLive && (
                  <Button
                    variant="icon"
                    className={liveStyles({ isLive })}
                    onClick={() => setIsLive?.(!isLive)}
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
                    className="z-10"
                  >
                    <div className="relative overflow-hidden rounded-2xl rounded-r-none border-0 border-r-0 border-white/50 bg-linear-to-b from-gray-50 to-white shadow-xs">
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
                      .map(({ entry, invocationId }) => (
                        <TimelineContainer
                          invocationId={invocationId}
                          entry={entry}
                          key={getTimelineId(
                            invocationId,
                            entry?.index,
                            entry?.type,
                            entry?.category,
                          )}
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
  invocationId,
  entry,
}: {
  invocationId: string;
  entry?: JournalEntryV2;
}) {
  const { setPortal } = usePortals(
    getTimelineId(invocationId, entry?.index, entry?.type, entry?.category),
  );
  return (
    <div
      className="relative h-9 w-full border-b border-transparent pr-2 pl-2 [content-visibility:auto] [&:not(:has(>*+*))]:hidden"
      ref={setPortal}
    >
      <div className="absolute top-1/2 right-0 left-0 h-px border-spacing-10 -translate-y-px border-b border-dashed border-gray-300/70" />
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

function getCombinedJournal(
  invocationId: string,
  data?: ReturnType<typeof useGetInvocationsJournalWithInvocationsV2>['data'],
  depth = 0,
):
  | {
      invocationId: string;
      entry?: JournalEntryV2;
      depth: number;
    }[]
  | undefined {
  if (data?.[invocationId]?.journal?.entries?.length === 0) {
    return [
      {
        invocationId,
        depth,
      },
    ];
  }

  const combinedEntries = data?.[invocationId]?.journal?.entries
    ?.map((entry) => {
      if (isExpandable(entry)) {
        const callInvocationId = String(entry.invocationId);
        return [
          {
            invocationId,
            entry,
            depth,
          },
          ...(getCombinedJournal(callInvocationId, data, depth + 1)?.flat() ??
            []),
        ].flat();
      } else {
        return {
          invocationId,
          entry,
          depth,
        };
      }
    })
    .flat();

  return combinedEntries;
}
