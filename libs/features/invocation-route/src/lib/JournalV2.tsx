import {
  Invocation,
  JournalEntry,
  useGetInvocationsJournalWithInvocations,
} from '@restate/data-access/admin-api';
import { lazy, Suspense, useRef, useState } from 'react';
import { InvocationId } from './InvocationId';
import { tv } from 'tailwind-variants';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';
import { Button } from '@restate/ui/button';
import { HoverTooltip } from '@restate/ui/tooltip';
import { useRestateContext } from '@restate/features/restate-context';
import { ErrorBanner } from '@restate/ui/error';
import { Entries, getEntryId, getTimelineId, isEntryCall } from './Entries';
import { JournalContextProvider } from './JournalContext';

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

const styles = tv({
  base: 'mt-8 gap-1',
});

export function JournalV2({
  invocationId,
  className,
  timelineWidth = 0.5,
  showApiError = true,
}: {
  invocationId: string;
  className?: string;
  timelineWidth?: number;
  showApiError?: boolean;
}) {
  const [invocationIds, setInvocationIds] = useState([String(invocationId)]);
  const {
    data,
    isPending,
    error: apiError,
    refetch,
    dataUpdatedAt,
  } = useGetInvocationsJournalWithInvocations(invocationIds, {
    refetchOnMount: true,
    staleTime: 0,
  });

  const journalAndInvocationData = data?.[invocationId];

  const { baseUrl } = useRestateContext();

  const combinedEntries = getCombinedJournal(invocationId, data);
  const containerRef = useRef<HTMLDivElement>(null);

  const invocationApiError = apiError?.[invocationId];

  if (apiError && invocationApiError) {
    return <ErrorBanner error={invocationApiError} />;
  }

  const start = new Date(
    journalAndInvocationData?.invocation?.created_at ??
      new Date(dataUpdatedAt).toISOString()
  ).getTime();
  const end = new Date(
    journalAndInvocationData?.invocation?.completed_at ??
      new Date(dataUpdatedAt).toISOString()
  ).getTime();

  const cancelEntries = journalAndInvocationData?.journal?.entries?.filter(
    (entry) => entry.entry_type === 'CancelSignal'
  );

  const isOldJournal = journalAndInvocationData?.journal?.entries.some(
    (entry) => !entry.version || entry.version === 1
  );

  return (
    <div ref={containerRef}>
      <JournalContextProvider
        invocationIds={invocationIds}
        setInvocationIds={setInvocationIds}
        start={start}
        end={end}
        dataUpdatedAt={dataUpdatedAt}
        cancelTime={cancelEntries?.at(0)?.start}
        isPending={isPending}
        containerRef={containerRef}
        error={apiError}
      >
        <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
          <Suspense fallback={<div />}>
            <LazyPanelGroup
              direction="horizontal"
              className={styles({ className })}
              style={{ overflow: 'visible' }}
            >
              <LazyPanel
                defaultSize={(1 - timelineWidth) * 100}
                className="pb-4"
                style={{ overflow: 'visible' }}
              >
                <div className="flex  flex-col items-start gap-1.5">
                  <div className="flex items-center gap-1.5 w-full h-7 relative">
                    <div className="w-2 bg-zinc-300 absolute left-2.5 h-2 rounded-full">
                      <div className="w-px absolute  left-1/2 h-4 top-full -translate-x-1/2 border-zinc-300 border border-dashed" />
                    </div>
                    <div className="shrink-0 text-xs uppercase font-semibold text-gray-400 pl-6">
                      Invoked by
                    </div>
                    {journalAndInvocationData?.invocation?.invoked_by ===
                    'ingress' ? (
                      <div className="text-xs font-medium">Ingress</div>
                    ) : journalAndInvocationData?.invocation?.invoked_by_id ? (
                      <InvocationId
                        id={journalAndInvocationData?.invocation?.invoked_by_id}
                        className="min-w-0 max-w-[20ch] font-medium"
                        size="sm"
                      />
                    ) : null}
                  </div>
                  <Entries invocationId={invocationId} showInputEntry />
                  <div
                    className="grid grid-cols-1 text-xs items-start gap-1.5 pl-2 w-full"
                    data-container
                  >
                    {combinedEntries?.map((entry) => (
                      <div
                        data-id={getEntryId(
                          entry.invocationId,
                          entry.entryIndex
                        )}
                        className="contents [&:has(*)]:block"
                        key={getEntryId(entry.invocationId, entry.entryIndex)}
                        style={{ paddingLeft: `${entry.depth * 1.125}rem` }}
                      />
                    ))}
                  </div>
                </div>
              </LazyPanel>
              {timelineWidth !== 0 && (
                <LazyPanelResizeHandle className="w-2 hidden md:flex justify-center items-center group relative">
                  <div className="w-px group-hover:w-[2px] absolute left-1/2 top-8 bottom-8 bg-gray-200  group-hover:bg-blue-500" />
                </LazyPanelResizeHandle>
              )}
              {
                <LazyPanel
                  defaultSize={timelineWidth * 100}
                  className="hidden md:flex"
                >
                  <div className="w-full h-full overflow-auto flex flex-col gap-0">
                    <div className="h-7 flex flex-row gap-2 items-center justify-end mb-[0.375rem]">
                      <HoverTooltip content="Refresh">
                        <Button variant="icon" onClick={refetch}>
                          <Icon name={IconName.Retry} className="w-4 h-4" />
                        </Button>
                      </HoverTooltip>
                      <HoverTooltip content="Introspect">
                        <Link
                          variant="icon"
                          href={`${baseUrl}/introspection?query=SELECT * FROM sys_journal WHERE id = '${journalAndInvocationData?.invocation?.id}'`}
                          target="_blank"
                        >
                          <Icon
                            name={IconName.ScanSearch}
                            className="w-4 h-4"
                          />
                        </Link>
                      </HoverTooltip>
                    </div>

                    {!isOldJournal &&
                      timelineWidth !== 0 &&
                      combinedEntries?.map((entry) => (
                        <div
                          data-id={getTimelineId(
                            entry.invocationId,
                            entry.entryIndex
                          )}
                          className="[&:has(*)]:min-h-7 [&:has(*)]:mb-1.5 [&:nth-child(2)]:min-h-[1.875rem]"
                          key={entry.entryIndex + entry.invocationId}
                        />
                      ))}
                    {isOldJournal && timelineWidth !== 0 && (
                      <div className="text-code mb-4 p-2 py-4 text-zinc-500 text-center rounded-xl border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]">
                        Update to the latest SDK to see more details in your
                        journal. Check the{' '}
                        <Link
                          href="https://docs.restate.dev/operate/versioning#deploying-new-service-versions"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          docs
                        </Link>{' '}
                        for more info.
                      </div>
                    )}
                  </div>
                </LazyPanel>
              }
            </LazyPanelGroup>
          </Suspense>
        </SnapshotTimeProvider>
      </JournalContextProvider>
    </div>
  );
}

function getCombinedJournal(
  invocationId: string,
  data?: Record<
    string,
    {
      journal: {
        entries: JournalEntry[];
      };
      invocation: Invocation;
    }
  >,
  depth = 0
):
  | {
      invocationId: string;
      entryIndex: number;
      depth: number;
    }[]
  | undefined {
  if (data?.[invocationId]?.journal?.entries?.length === 0) {
    return [
      {
        invocationId,
        entryIndex: 0,
        depth,
      },
    ];
  }

  const length = (data?.[invocationId]?.journal?.entries ?? []).length;
  const combinedEntries = data?.[invocationId]?.journal?.entries
    ?.map((entry) => {
      if (isEntryCall(entry)) {
        const invoked_id = String(entry.invoked_id);
        return [
          {
            invocationId,
            entryIndex: entry.index,
            depth,
          },
          ...(getCombinedJournal(invoked_id, data, depth + 1)?.flat() ?? []),
        ].flat();
      } else {
        return {
          invocationId,
          entryIndex: entry.index,
          depth,
        };
      }
    })
    .flat();

  return [
    ...(combinedEntries ?? []),
    {
      invocationId,
      entryIndex: length,
      depth,
    },
  ];
}
