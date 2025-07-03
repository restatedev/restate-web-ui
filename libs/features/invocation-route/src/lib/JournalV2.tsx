import {
  JournalEntryV2,
  useGetInvocationsJournalWithInvocationsV2,
} from '@restate/data-access/admin-api';
import { Fragment, lazy, Suspense, useCallback, useState } from 'react';
import { InvocationId } from './InvocationId';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';
import { Button } from '@restate/ui/button';
import { HoverTooltip } from '@restate/ui/tooltip';
import { useRestateContext } from '@restate/features/restate-context';
import { ErrorBanner } from '@restate/ui/error';
import { JournalContextProvider } from './JournalContext';
import { Spinner } from '@restate/ui/loading';
import { Entry } from './Entry';
import { Input } from './entries/Input';
import { getTimelineId, PortalProvider, usePortals } from './Portals';
import { LifeCycleProgress, Units } from './LifeCycleProgress';
import { ErrorBoundary } from './ErrorBoundry';

const LazyPanel = lazy(() =>
  import('react-resizable-panels').then((m) => ({ default: m.Panel }))
);
const LazyPanelGroup = lazy(() =>
  import('react-resizable-panels').then((m) => ({
    default: m.PanelGroup,
  }))
);
const LazyPanelResizeHandle = lazy(() =>
  import('react-resizable-panels').then((m) => ({
    default: m.PanelResizeHandle,
  }))
);

export function JournalV2({
  invocationId,
  className,
  timelineWidth = 0.5,
  showApiError = true,
  withTimeline = true,
  isLive = false,
}: {
  invocationId: string;
  className?: string;
  timelineWidth?: number;
  showApiError?: boolean;
  withTimeline?: boolean;
  isLive?: boolean;
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
    [invalidate]
  );
  const removeInvocationId = useCallback((idToBeRemoved: string) => {
    setInvocationIds((ids) => {
      return ids.filter((id) => id !== idToBeRemoved);
    });
  }, []);

  const journalAndInvocationData = data?.[invocationId];

  const { baseUrl } = useRestateContext();

  const combinedEntries = getCombinedJournal(invocationId, data)?.filter(
    ({ entry }) => withTimeline || entry?.category === 'command'
  );

  const invocationApiError = apiError?.[invocationId];

  if (invocationApiError && showApiError) {
    return <ErrorBanner error={invocationApiError} />;
  }

  const dataUpdatedAt = allQueriesDataUpdatedAt[invocationId]!;

  if (isPending[invocationId]) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-zinc-500 px-4 py-2">
        <Spinner className="w-4 h-4" />
        Loading…
      </div>
    );
  }

  if (!journalAndInvocationData) {
    return null;
  }
  const start = new Date(
    journalAndInvocationData?.created_at ??
      new Date(dataUpdatedAt).toISOString()
  ).getTime();
  const end = Math.max(
    ...(combinedEntries?.map(({ entry }) =>
      entry?.end
        ? new Date(entry.end).getTime()
        : entry?.start
        ? new Date(entry.start).getTime()
        : -1
    ) ?? []),
    !invocationIds.every((id) => data[id]?.completed_at)
      ? Math.max(
          ...Array.from(Object.values(allQueriesDataUpdatedAt).map(Number))
        )
      : -1
  );

  const entriesElements = (
    <>
      <div className="ring-1 ring-black/5 shadow-sm z-10 h-12 box-border border-b border-transparent last:border-none flex items-center bg-gray-100 rounded-bl-2xl">
        <Input
          entry={
            combinedEntries?.find(
              (combinedEntry) =>
                combinedEntry.invocationId === invocationId &&
                combinedEntry.entry?.type === 'Input'
            )?.entry as Extract<
              JournalEntryV2,
              { type?: 'Input'; category?: 'command' }
            >
          }
          invocation={data?.[invocationId]}
          className="w-full "
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
              <div className="flex items-center gap-1.5 text-sm text-zinc-500 p-4">
                <Spinner className="w-4 h-4" />
                Loading…
              </div>
            }
          >
            <div className="flex h-9 items-center absolute -top-9 w-full">
              <div className="flex items-center gap-1.5 w-full h-full relative">
                <div className="w-2 bg-zinc-300 absolute left-2.5 h-2 rounded-full">
                  <div className="w-px absolute  left-1/2 h-3.5 top-full -translate-x-1/2  border-zinc-300 border border-dashed" />
                </div>
                <div className="shrink-0 text-xs uppercase font-semibold text-gray-400 pl-6">
                  Invoked by
                </div>
                {journalAndInvocationData?.invoked_by === 'ingress' ? (
                  <div className="text-xs font-medium">Ingress</div>
                ) : journalAndInvocationData?.invoked_by_id ? (
                  <InvocationId
                    id={journalAndInvocationData?.invoked_by_id}
                    className="min-w-0 max-w-[20ch] font-semibold text-code"
                  />
                ) : null}
              </div>
              <div className="ml-auto flex flex-row gap-2 items-center justify-end z-10 h-full bg-gradient-to-l from-gray-100 via-gray-100 to-gray-100/0 rounded-lg pl-10">
                <HoverTooltip content="Refresh">
                  <Button variant="icon" onClick={refetch}>
                    <Icon name={IconName.Retry} className="w-4 h-4" />
                  </Button>
                </HoverTooltip>
                <HoverTooltip content="Introspect">
                  <Link
                    variant="icon"
                    href={`${baseUrl}/introspection?query=SELECT id, index, appended_at, entry_type, name, entry_lite_json AS metadata FROM sys_journal WHERE id = '${journalAndInvocationData?.id}'`}
                    target="_blank"
                  >
                    <Icon name={IconName.ScanSearch} className="w-4 h-4" />
                  </Link>
                </HoverTooltip>
              </div>
            </div>
            <div className="relative text-code font-mono">
              {withTimeline ? (
                <LazyPanelGroup
                  direction="horizontal"
                  className={'gap-0'}
                  style={{ overflow: 'visible' }}
                >
                  <LazyPanel
                    defaultSize={(1 - timelineWidth) * 100}
                    className="z-10 "
                  >
                    <div className="border-0 border-white/50 border-r-0  bg-gradient-to-b from-gray-50 to-white shadow-sm rounded-2xl rounded-r-none relative overflow-hidden ">
                      {entriesElements}
                    </div>
                  </LazyPanel>
                  <LazyPanelResizeHandle className="w-px hidden md:flex justify-center items-center group relative">
                    <div className="w-px group-hover:w-[2px] absolute left-0 top-3 bottom-3 bg-transparent group-hover:bg-blue-500" />
                  </LazyPanelResizeHandle>
                  <LazyPanel
                    defaultSize={timelineWidth * 100}
                    className="hidden md:block relative"
                    style={{ overflow: 'visible' }}
                  >
                    <Units
                      className=" absolute inset-0"
                      invocation={journalAndInvocationData}
                    />
                    <div className=" border border-transparent">
                      <LifeCycleProgress
                        className=" h-12 px-2"
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
                            entry?.category
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
    getTimelineId(invocationId, entry?.index, entry?.type, entry?.category)
  );
  return (
    <div
      className="w-full [content-visibility:auto] pl-2 pr-2 h-9 border-b  border-transparent relative [&:not(:has(>*+*))]:hidden"
      ref={setPortal}
    >
      <div className="absolute left-0 right-0 h-px top-1/2 border-gray-300/70  translate-y-[-1px] border-dashed border-b border-spacing-10" />
    </div>
  );
}

function isExpandable(
  entry: JournalEntryV2
): entry is
  | Extract<JournalEntryV2, { type?: 'Call'; category?: 'command' }>
  | Extract<
      JournalEntryV2,
      { type?: 'AttachInvocation'; category?: 'command' }
    > {
  return Boolean(
    entry.type &&
      ['Call', 'AttachInvocation'].includes(entry.type) &&
      entry.category === 'command'
  );
}

function getCombinedJournal(
  invocationId: string,
  data?: ReturnType<typeof useGetInvocationsJournalWithInvocationsV2>['data'],
  depth = 0
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
