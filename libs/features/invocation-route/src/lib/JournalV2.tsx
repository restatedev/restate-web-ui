import {
  InputJournalEntryType,
  Invocation,
  JournalEntry,
  useGetInvocationJournalWithInvocation,
} from '@restate/data-access/admin-api';
import {
  ComponentType,
  CSSProperties,
  lazy,
  PropsWithChildren,
  Suspense,
  useState,
} from 'react';
import { Input } from './entries/Input';
import { Target } from './Target';
import { ENTRY_COMPONENTS, ErrorBoundary, getLastFailure } from './Journal';
import { EntryProps } from './entries/types';
import { getRestateError } from './Status';
import { InvocationId } from './InvocationId';
import { createPortal } from 'react-dom';
import { tv } from 'tailwind-variants';
import { formatDurations } from '@restate/util/intl';
import { getDuration, SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';
import { Button } from '@restate/ui/button';
import { DateTooltip, HoverTooltip } from '@restate/ui/tooltip';
import { useRestateContext } from '@restate/features/restate-context';
import { ErrorBanner } from '@restate/ui/error';

const LazyPanel = lazy(() =>
  import('react-resizable-panels').then((m) => ({ default: m.Panel }))
);
const LazyPanelGroup = lazy(() =>
  import('react-resizable-panels').then((m) => ({ default: m.PanelGroup }))
);
const LazyPanelResizeHandle = lazy(() =>
  import('react-resizable-panels').then((m) => ({
    default: m.PanelResizeHandle,
  }))
);

const inputStyles = tv({
  base: '[&_>*]:leading-7 [--rounded-radius:0.625rem] [--rounded-radius-right:0.25rem] rounded-r text-code w-full',
  variants: {
    hasInputEntry: {
      true: '',
      false: '[&>*]:w-full',
    },
  },
});

const styles = tv({
  base: 'mt-8',
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
  const {
    data: journalAndInvocationData,
    isPending,
    error: apiError,
    refetch,
    dataUpdatedAt,
  } = useGetInvocationJournalWithInvocation(String(invocationId), {
    refetchOnMount: true,
    staleTime: 0,
  });

  const [first, ...restEntries] =
    journalAndInvocationData?.journal.entries ?? [];

  const inputEntry = first as InputJournalEntryType;
  const [isMounted, setIsMounted] = useState(false);
  const { baseUrl } = useRestateContext();

  if (apiError && showApiError) {
    return <ErrorBanner error={apiError} />;
  }

  if (!journalAndInvocationData) {
    return null;
  }
  const lastFailure = getLastFailure(journalAndInvocationData.invocation);
  const error = getRestateError(journalAndInvocationData.invocation);
  const start = new Date(
    journalAndInvocationData.invocation.created_at
  ).getTime();
  const end = new Date(
    journalAndInvocationData.invocation.completed_at ??
      new Date(dataUpdatedAt).toISOString()
  ).getTime();

  const hasInputEntry = inputEntry?.entry_type === 'Input';
  const cancelEntry = journalAndInvocationData.journal.entries?.find(
    (entry) => entry.entry_type === 'CancelSignal'
  );
  const lifecylcles = getLifeCycles(
    journalAndInvocationData.invocation,
    dataUpdatedAt,
    cancelEntry?.start
  );

  const isOldJournal = first && (!first.version || first.version === 1);

  return (
    <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
      <Suspense fallback={<div />}>
        <LazyPanelGroup
          direction="horizontal"
          className={styles({ className })}
        >
          <LazyPanel defaultSize={(1 - timelineWidth) * 100} className="pb-4">
            <div className="flex  flex-col items-start gap-1.5">
              <div className="flex items-center gap-1.5 w-full h-7 relative">
                <div className="w-2 bg-zinc-300 absolute left-2.5 h-2 rounded-full">
                  <div className="w-px absolute left-1/2 h-8 top-full -translate-x-1/2 border-zinc-300 border border-dashed" />
                </div>
                <div className="shrink-0 text-xs uppercase font-semibold text-gray-400 pl-6">
                  Invoked by
                </div>
                {journalAndInvocationData.invocation.invoked_by ===
                'ingress' ? (
                  <div className="text-sm font-regular">Ingress</div>
                ) : (
                  <InvocationId
                    id={journalAndInvocationData.invocation.invoked_by_id!}
                    className="text-xs min-w-0 max-w-[20ch]"
                  />
                )}
              </div>
              <Target
                target={journalAndInvocationData.invocation.target}
                showHandler={!hasInputEntry}
                className={inputStyles({ hasInputEntry })}
              >
                {hasInputEntry && (
                  <Input
                    invocation={journalAndInvocationData.invocation}
                    entry={inputEntry}
                    className="text-xs w-full"
                  />
                )}
              </Target>
              <div className="flex text-xs flex-col items-start gap-1.5 pl-2 w-full">
                {restEntries.map((entry) => {
                  return (
                    isMounted && (
                      <Entry
                        key={entry.index}
                        entry={entry}
                        invocation={journalAndInvocationData.invocation}
                        appended
                        failed={
                          entry.command_index === lastFailure?.index ||
                          Boolean('failure' in entry && entry.failure)
                        }
                        {...(entry.command_index === lastFailure?.index && {
                          error,
                        })}
                        start={start}
                        end={end}
                        now={dataUpdatedAt}
                        cancelTime={cancelEntry?.start}
                      />
                    )
                  );
                })}
                {journalAndInvocationData.invocation &&
                  (lastFailure?.index === undefined ||
                    lastFailure?.index ===
                      journalAndInvocationData.journal.entries.length) && (
                    <Entry
                      invocation={journalAndInvocationData.invocation}
                      start={start}
                      end={end}
                      now={dataUpdatedAt}
                      failed
                      error={error}
                      entry={
                        {
                          entry_type: lastFailure.type,
                          name: lastFailure.name,
                          index:
                            journalAndInvocationData.journal.entries.length,
                          command_index:
                            journalAndInvocationData.journal.entries.length,
                        } as any
                      }
                    />
                  )}
              </div>
            </div>
          </LazyPanel>
          {timelineWidth !== 0 && (
            <LazyPanelResizeHandle className="w-3 pt-8 pb-4 hidden md:flex justify-center items-center group">
              <div className="w-px bg-gray-200 h-full group-hover:bg-blue-500" />
            </LazyPanelResizeHandle>
          )}
          {
            <LazyPanel
              defaultSize={timelineWidth * 100}
              className="hidden md:flex"
            >
              <div
                ref={(el) => {
                  setIsMounted(!!el);
                }}
                className="w-full h-full overflow-auto flex flex-col gap-0"
              >
                <div className="h-7 flex flex-row gap-2 items-center justify-end">
                  <HoverTooltip content="Refresh">
                    <Button variant="icon" onClick={refetch}>
                      <Icon name={IconName.Retry} className="w-4 h-4" />
                    </Button>
                  </HoverTooltip>
                  <HoverTooltip content="Introspect">
                    <Link
                      variant="icon"
                      href={`${baseUrl}/introspection?query=SELECT * FROM sys_journal WHERE id = '${journalAndInvocationData.invocation.id}'`}
                      target="_blank"
                    >
                      <Icon name={IconName.ScanSearch} className="w-4 h-4" />
                    </Link>
                  </HoverTooltip>
                </div>
                <div className="h-[1.875rem] py-1.5 mt-1.5">
                  <div className="relative w-full h-full flex flex-row">
                    {lifecylcles.map((event) => (
                      <div
                        key={event.type}
                        {...(event.end && {
                          style: {
                            flexBasis: `${
                              (100 * (event.end - event.start)) / (end - start)
                            }%`,
                          },
                        })}
                        className="flex [&>*]:w-full [&>*]:px-0  [&>*]:mx-0 relative"
                      >
                        <DateTooltip
                          date={new Date(event.start)}
                          title={TOOLTIP_LIFECyCLES[event.type]}
                          className=""
                        >
                          <Progress
                            startTime={event.start}
                            endTime={event.end}
                            start={(event.start - start) / (end - start)}
                            {...(event.end && {
                              end: (event.end - start) / (end - start),
                            })}
                            className="static"
                            mode={event.type}
                          />
                        </DateTooltip>
                      </div>
                    ))}
                  </div>
                </div>
                {!isOldJournal &&
                  timelineWidth !== 0 &&
                  restEntries.map((entry) => (
                    <div
                      id={getTimelineId(
                        journalAndInvocationData.invocation.id,
                        entry.index
                      )}
                      className="[&:has(*)]:h-7 [&:has(*)]:mt-1.5 "
                      key={entry.index}
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
  );
}

const entryStyles = tv({
  base: 'leading-7 [&>*]:-translate-y-px font-mono w-full px-2 h-7 bg-zinc-50 rounded-l-[0.625rem] rounded-r border',
  variants: {
    isCall: {
      true: 'bg-transparent [&>*]:pr-0 px-0 font-sans border-none [&>*>*]:leading-7 [&>*>*]:[--rounded-radius:0.625rem] [&>*>*]:[--rounded-radius-right:0.625rem]',
      false: '',
    },
    isOneWayCall: {
      true: 'bg-transparent [&>*]:pr-0 px-0 font-sans border-none [&>*>*]:leading-7 [&>*>*]:[--rounded-radius:0.625rem] [&>*>*]:[--rounded-radius-right:0.625rem]',
      false: '',
    },
  },
});
function Entry({
  entry,
  failed,
  invocation,
  error,
  start,
  end,
  now,
  cancelTime,
}: EntryProps<JournalEntry> & {
  start: number;
  end: number;
  cancelTime?: string;
  now: number;
}) {
  const EntrySpecificComponent = entry.entry_type
    ? (ENTRY_COMPONENTS[entry.entry_type] as ComponentType<
        EntryProps<JournalEntry>
      >)
    : undefined;
  const completed = 'completed' in entry ? !!entry.completed : true;
  const isRetrying = invocation.status === 'retrying';
  const isRetryingThisEntry =
    isRetrying &&
    failed &&
    (entry.version && entry.version >= 2
      ? !entry.completed
      : entry.index >= (invocation.journal_size ?? 0));
  const lastFailure = getLastFailure(invocation);

  const wasRetryingThisEntry =
    !isRetrying && failed && entry.command_index === (lastFailure.index ?? -1);

  if (!EntrySpecificComponent) {
    return null;
  }

  const interval = end - start;
  const entryEnd = entry.end
    ? new Date(entry.end).getTime()
    : cancelTime && entry.start && entry.start < cancelTime && !completed
    ? new Date(cancelTime).getTime()
    : !completed
    ? now
    : undefined;

  return (
    <div
      className={entryStyles({
        isCall: entry.entry_type === 'Call',
        isOneWayCall: entry.entry_type === 'OneWayCall',
      })}
    >
      <ErrorBoundary
        entry={entry}
        className="bg-transparent border-none mb-0 p-0"
      >
        <EntrySpecificComponent
          entry={entry}
          failed={failed}
          invocation={invocation}
          error={error}
          isRetrying={isRetryingThisEntry}
          wasRetrying={wasRetryingThisEntry}
        />
        {entry.start && (
          <TimelineProtal index={entry.index} invocationId={invocation.id}>
            <div className="leading-7 flex items-center h-full py-2.5">
              <div className="relative w-full h-full rounded-sm bg-zinc-200/50">
                <Progress
                  startTime={new Date(entry.start).getTime()}
                  start={(new Date(entry.start).getTime() - start) / interval}
                  {...(entryEnd && {
                    end: (entryEnd - start) / interval,
                    endTime: entryEnd,
                  })}
                  isPending={!completed}
                  isRetrying={isRetryingThisEntry}
                  className="ml-0.5"
                  showDuration
                >
                  <DateTooltip
                    date={new Date(entry.start)}
                    title="Appended at"
                    className="min-w-2 block h-full"
                  />
                </Progress>
              </div>
            </div>
          </TimelineProtal>
        )}
        {!entry.start && (
          <TimelineProtal index={entry.index} invocationId={invocation.id}>
            <div />
          </TimelineProtal>
        )}
      </ErrorBoundary>
    </div>
  );
}

function getTimelineId(invocationId: string, index: number) {
  return `${invocationId}-journal-${index}`;
}

function TimelineProtal({
  children,
  index,
  invocationId,
}: PropsWithChildren<{ invocationId: string; index: number }>) {
  const element = document.getElementById(getTimelineId(invocationId, index));

  if (!element) {
    return null;
  }

  return createPortal(children, element);
}

const progressStyles = tv({
  base: 'absolute h-full bg-blue-400 min-w-0.5 rounded-md @container',
  variants: {
    isPending: { true: 'animate-pulse', false: '' },
    isRetrying: { true: 'bg-orange-200', false: '' },
    mode: {
      suspended: 'bg-zinc-300',
      running: '',
      pending: 'border-dashed bg-transparent border border-orange-400 ',
      created: 'bg-zinc-300',
      scheduled: 'border border-dashed bg-transparent border-zinc-300',
      completed: '',
      cancel: '',
    },
  },
});

const TOOLTIP_LIFECyCLES: Record<
  | 'created'
  | 'running'
  | 'scheduled'
  | 'suspended'
  | 'pending'
  | 'completed'
  | 'cancel',
  string
> = {
  completed: 'Completed at',
  running: 'Running since',
  suspended: 'Suspended at',
  scheduled: 'Scheduled at',
  pending: 'Pending since',
  created: 'Created at',
  cancel: 'Cancelled at',
};

function Progress({
  start,
  end,
  className,
  startTime,
  endTime = startTime,
  children,
  isPending,
  isRetrying,
  mode = 'running',
  style,
  showDuration,
}: PropsWithChildren<{
  start: number;
  end?: number;
  className?: string;
  startTime: number;
  endTime?: number;
  isPending?: boolean;
  isRetrying?: boolean;
  mode?:
    | 'created'
    | 'running'
    | 'scheduled'
    | 'suspended'
    | 'pending'
    | 'completed'
    | 'cancel';
  style?: CSSProperties;
  showDuration?: boolean;
}>) {
  const { isPast, ...parts } = getDuration(endTime - startTime);
  const duration = formatDurations(parts);

  return (
    <div
      className={progressStyles({ className, isPending, isRetrying, mode })}
      style={{
        left: `${start * 100}%`,
        ...(end && {
          right: `${(1 - end) * 100}%`,
        }),
        ...style,
      }}
      data-mode={mode}
    >
      {children}
      {showDuration && (
        <div className="absolute top-full text-2xs left-0 text-zinc-500 leading-4 mt-0.5 whitespace-nowrap">
          {duration || (mode === 'running' ? <>0ms</> : null)}
        </div>
      )}
    </div>
  );
}

function getLifeCycles(
  invocation: Invocation,
  now: number,
  cancelTime?: string
): {
  start: number;
  end: number;
  type:
    | 'created'
    | 'running'
    | 'scheduled'
    | 'suspended'
    | 'pending'
    | 'completed'
    | 'cancel';
}[] {
  const values: {
    start: number;
    type:
      | 'created'
      | 'running'
      | 'scheduled'
      | 'suspended'
      | 'pending'
      | 'completed'
      | 'cancel'
      | 'now';
  }[] = [];

  values.push({
    start: new Date(invocation.created_at).getTime(),
    type: 'created',
  });
  if (invocation.scheduled_at) {
    values.push({
      start: new Date(invocation.scheduled_at).getTime(),
      type: 'scheduled',
    });
  }
  if (invocation.inboxed_at) {
    values.push({
      start: new Date(invocation.inboxed_at).getTime(),
      type: 'pending',
    });
  }
  if (invocation.running_at) {
    values.push({
      start: new Date(invocation.running_at).getTime(),
      type: 'running',
    });
  }

  if (cancelTime) {
    values.push({
      start: new Date(cancelTime).getTime(),
      type: 'cancel',
    });
  }
  if (invocation.completed_at) {
    values.push({
      start: new Date(invocation.completed_at).getTime(),
      type: 'completed',
    });
  } else {
    values.push({
      start: now,
      type: 'now',
    });
  }
  if (invocation.modified_at && invocation.status === 'suspended') {
    values.push({
      start: new Date(invocation.modified_at).getTime(),
      type: 'suspended',
    });
  }

  values.sort((a, b) => {
    return a.start - b.start;
  });

  return values
    .map((value, i, values) => {
      return { ...value, end: values.at(i + 1)?.start };
    })
    .filter((value) => value.type !== 'now') as {
    start: number;
    end: number;
    type:
      | 'created'
      | 'running'
      | 'scheduled'
      | 'suspended'
      | 'pending'
      | 'completed'
      | 'cancel';
  }[];
}
