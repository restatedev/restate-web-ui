import {
  JournalEntry,
  InputJournalEntryType,
  useGetInvocationsJournalWithInvocations,
  Invocation,
  CallJournalEntryType,
  OneWayCallJournalEntryType,
} from '@restate/data-access/admin-api';
import { DateTooltip } from '@restate/ui/tooltip';
import { formatDurations } from '@restate/util/intl';
import {
  ComponentType,
  PropsWithChildren,
  CSSProperties,
  useState,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { tv } from 'tailwind-variants';
import { EntryProps } from './entries/types';
import { getLastFailure, ENTRY_COMPONENTS, ErrorBoundary } from './Journal';
import { getRestateError } from './Status';
import { Target } from './Target';
import { Input } from './entries/Input';
import { getDuration } from '@restate/util/snapshot-time';
import { useJournalContext } from './JournalContext';
import { Spinner } from '@restate/ui/loading';

const inputStyles = tv({
  base: '[&_>*]:leading-7 [--rounded-radius:0.625rem] [--rounded-radius-right:0.25rem] rounded-r text-code w-full',
  variants: {
    hasInputEntry: {
      true: '',
      false: '[&>*]:w-full',
    },
  },
});

function getLifeCycles(
  invocation: Invocation,
  now: number,
  cancelTimes?: string[]
): {
  start: number;
  end: number;
  type:
    | 'created'
    | 'running'
    | 'scheduled'
    | 'suspended'
    | 'pending'
    | 'succeeded'
    | 'failed'
    | 'killed'
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
      | 'succeeded'
      | 'failed'
      | 'killed'
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

  if (cancelTimes && cancelTimes.length > 0) {
    values.push(
      ...cancelTimes.map(
        (cancelTime) =>
          ({
            start: new Date(cancelTime).getTime(),
            type: 'cancel',
          } as const)
      )
    );
  }
  if (invocation.completed_at) {
    values.push({
      start: new Date(invocation.completed_at).getTime(),
      type:
        invocation.status === 'succeeded'
          ? 'succeeded'
          : invocation.status === 'killed'
          ? 'killed'
          : 'failed',
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
      | 'succeeded'
      | 'failed'
      | 'killed'
      | 'cancel';
  }[];
}

const TOOLTIP_LIFECyCLES: Record<
  | 'created'
  | 'running'
  | 'scheduled'
  | 'suspended'
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'killed'
  | 'cancel',
  string
> = {
  failed: 'Failed at',
  succeeded: 'Succeeded at',
  running: 'Start running at',
  killed: 'Killed at',
  suspended: 'Suspended at',
  scheduled: 'Scheduled at',
  pending: 'Pending since',
  created: 'Created at',
  cancel: 'Cancelled at',
};

export function Entries({
  invocationId,
  showInputEntry,
  showLifeCycles = true,
}: {
  showInputEntry?: boolean;
  showLifeCycles?: boolean;
  invocationId: string;
}) {
  const {
    start,
    end,
    cancelTime,
    dataUpdatedAt,
    invocationIds,
    isPending: invocationsIsPending,
  } = useJournalContext();
  const { data } = useGetInvocationsJournalWithInvocations(invocationIds, {
    enabled: false,
  });
  const invocation = data?.[invocationId]?.invocation;
  const entries = data?.[invocationId]?.journal?.entries ?? [];

  const [first, ...restEntries] = entries ?? [];
  const inputEntry = first as InputJournalEntryType;
  const hasInputEntry = inputEntry?.entry_type === 'Input';
  const isPending = invocationsIsPending?.[invocationId];

  if (!invocation) {
    if (isPending) {
      return (
        <div className="flex items-center gap-1.5 text-code text-zinc-500 pl-2">
          <Spinner className="w-3.5 h-3.5" />
          Loading…
        </div>
      );
    }
    return null;
  }

  const invocationStart = new Date(invocation.created_at).getTime();
  const lastFailure = getLastFailure(invocation);
  const error = getRestateError(invocation);

  const cancelEntries = entries?.filter(
    (entry) => entry.entry_type === 'CancelSignal'
  );

  const lifeCycles = getLifeCycles(
    invocation,
    dataUpdatedAt,
    cancelEntries
      .map((cancelEntry) => cancelEntry?.start)
      .filter(Boolean) as string[]
  );

  return (
    <>
      {showInputEntry && (
        <Target
          target={invocation?.target}
          showHandler={!hasInputEntry}
          className={inputStyles({ hasInputEntry })}
        >
          {hasInputEntry && (
            <>
              <Input
                invocation={invocation}
                entry={inputEntry}
                className="text-xs w-full"
              />
              <div data-fill />
            </>
          )}
        </Target>
      )}
      {isPending && (
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 pl-2">
          <Spinner className="w-3 h-3" />
          Loading…
        </div>
      )}
      {restEntries.map((entry) => {
        return (
          <Entry
            key={entry.index}
            entry={entry}
            invocation={invocation}
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
            cancelTime={cancelTime}
          />
        );
      })}
      {invocation &&
        (lastFailure?.index === undefined ||
          lastFailure?.index === entries?.length) && (
          <Entry
            invocation={invocation}
            start={start}
            end={end}
            now={dataUpdatedAt}
            failed
            error={error}
            entry={
              {
                entry_type: lastFailure.type,
                name: lastFailure.name,
                index: entries?.length,
                command_index: entries?.length,
              } as any
            }
          />
        )}
      {invocation && showLifeCycles && (
        <LifecyclePortal invocationId={invocation.id}>
          <div className="h-7">
            <div className="relative  w-full h-full flex flex-row rounded-md bg-zinc-200/50">
              <div
                style={{
                  flexBasis: `${
                    (100 * (invocationStart - start)) / (end - start)
                  }%`,
                }}
              />
              {lifeCycles.map((event, i) => (
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
                    className="rounded-md hover:bg-transparent"
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
                      isRetrying={invocation.isRetrying}
                      isRunning={invocation.status === 'running'}
                    />
                  </DateTooltip>
                </div>
              ))}
            </div>
          </div>
        </LifecyclePortal>
      )}
    </>
  );
}

const entryStyles = tv({
  base: 'text-xs leading-7 [&>*]:-translate-y-px font-mono w-full px-2 h-7 bg-zinc-50 rounded-l-[0.625rem] rounded-r border',
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
  const { invocationIds, error: invocationsError } = useJournalContext();

  const EntrySpecificComponent = entry.entry_type
    ? (ENTRY_COMPONENTS[entry.entry_type] as ComponentType<
        EntryProps<JournalEntry>
      >)
    : undefined;
  const completed = 'completed' in entry ? !!entry.completed : true;
  const isRetrying = invocation.isRetrying;
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
    <EntryPortal invocationId={invocation.id} index={entry.index}>
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
          {entry.start &&
            (!isEntryCall(entry) ||
              !invocationIds.includes(String(entry?.invoked_id)) ||
              invocationsError?.[String(entry.invoked_id)]) && (
              <TimelinePortal index={entry.index} invocationId={invocation.id}>
                <div className="leading-7 flex items-center h-full ">
                  <div className="relative w-full h-full rounded-md bg-zinc-200/50">
                    <Progress
                      startTime={new Date(entry.start).getTime()}
                      start={
                        (new Date(entry.start).getTime() - start) / interval
                      }
                      {...(entryEnd && {
                        end: (entryEnd - start) / interval,
                        endTime: entryEnd,
                      })}
                      isPending={
                        !completed &&
                        (!cancelTime ||
                          new Date(cancelTime).getTime() <
                            new Date(entry.start).getTime())
                      }
                      isRetrying={isRetryingThisEntry}
                      isRunning={!completed}
                      className="ml-0.5 top-1  h-1.5"
                      showDuration
                    >
                      <DateTooltip
                        date={new Date(entry.start)}
                        title="Appended at"
                        className="min-w-2 block h-full rounded-md absolute inset-0 z-[2]"
                      />
                    </Progress>
                  </div>
                </div>
              </TimelinePortal>
            )}
          {!entry.start && (
            <TimelinePortal index={entry.index} invocationId={invocation.id}>
              <div />
            </TimelinePortal>
          )}
        </ErrorBoundary>
      </div>
    </EntryPortal>
  );
}

export function getTimelineId(invocationId: string, index: number) {
  return `${invocationId}-journal-timeline-${index}`;
}
export function getEntryId(invocationId: string, index: number) {
  return `${invocationId}-journal-entry-${index}`;
}

function usePortal(query: string) {
  const { containerRef } = useJournalContext();
  const [element, setElement] = useState<Element | null | undefined>();

  useEffect(() => {
    const container = containerRef?.current;
    const cb: MutationCallback = (mutations, observer) => {
      const element = container?.querySelector(query);
      setElement(element);
      if (element) {
        observer.disconnect();
      }
    };
    const observer = new MutationObserver(cb);

    if (container) {
      observer.observe(container, {
        childList: true,
        attributes: false,
        subtree: true,
      });
      cb([], observer);
    }

    return () => {
      observer.disconnect();
    };
  }, [containerRef, query]);

  return { element };
}

function TimelinePortal({
  children,
  index,
  invocationId,
}: PropsWithChildren<{ invocationId: string; index: number }>) {
  const { element } = usePortal(
    `[data-id=${getTimelineId(invocationId, index)}]`
  );

  if (!element) {
    return null;
  }

  return createPortal(children, element);
}

function LifecyclePortal({
  children,
  invocationId,
}: PropsWithChildren<{ invocationId: string }>) {
  const { element } = usePortal(`[data-id=${getTimelineId(invocationId, 0)}]`);

  if (!element) {
    return null;
  }

  return createPortal(children, element);
}

function EntryPortal({
  children,
  index,
  invocationId,
}: PropsWithChildren<{ invocationId: string; index: number }>) {
  const { element } = usePortal(`[data-id=${getEntryId(invocationId, index)}]`);

  if (!element) {
    return null;
  }

  return createPortal(children, element);
}

const progressStyles = tv({
  base: 'absolute h-full bg-blue-300 min-w-[2px] rounded-md @container hover:min-w-2 hover:mt-0 hover:h-full hover:top-0 hover:z-10 transition-all transform',
  variants: {
    isPending: { true: '', false: '' },
    isRetrying: {
      true: 'bg-orange-200',
      false: '',
    },
    isRunning: {
      true: ' ',
      false: '',
    },
    mode: {
      suspended:
        'h-3 mt-2 [background:repeating-linear-gradient(to_right,theme(colors.zinc.200/0),theme(colors.zinc.200/0)_4px,theme(colors.zinc.300)_4px,theme(colors.zinc.300)_8px)] border border-dashed border-zinc-400/50 ',
      running: 'border border-blue-400/70',
      pending:
        'h-3 mt-2 border-dashed bg-transparent border border-orange-300 ',
      created: 'h-3 mt-2 bg-zinc-300',
      scheduled:
        'h-3 mt-2 border border-dashed border-zinc-400/50 bg-zinc-100/0',
      succeeded: 'bg-green-300',
      killed: 'bg-zinc-300',
      failed: 'bg-red-400',
      cancel: 'border border-blue-400/30 bg-blue-100',
    },
  },
  compoundVariants: [
    {
      mode: 'running',
      isRetrying: true,
      className: 'bg-orange-200 border-orange-400/30',
    },
  ],
});

const animationStyles = tv({
  base: 'absolute left-[-36px] right-[-36px] top-0 bottom-0 hidden opacity-80',
  variants: {
    isPending: { true: '', false: '' },
    isRetrying: {
      true: '[background:repeating-linear-gradient(-45deg,theme(colors.orange.200),theme(colors.orange.200)_8px,theme(colors.orange.300/5)_8px,theme(colors.orange.300/5)_12px)]',
      false: '',
    },
    isRunning: {
      true: '',
      false: '',
    },
    mode: {
      suspended: '',
      running: 'block ',
      pending: '',
      created: '',
      scheduled: '',
      succeeded: '',
      killed: '',
      failed: '',
      cancel:
        'block [background:repeating-linear-gradient(-45deg,theme(colors.blue.100),theme(colors.blue.100)_8px,theme(colors.blue.300)_8px,theme(colors.blue.300)_12px)] [animation-duration:2000ms] animate-in slide-in-from-left-[34px] repeat-infinite ',
    },
  },
  compoundVariants: [
    {
      mode: 'running',
      isRetrying: true,
      className:
        '[animation-duration:2000ms] animate-in slide-in-from-left-[34px] repeat-infinite [background:repeating-linear-gradient(-45deg,theme(colors.orange.200),theme(colors.orange.200)_8px,theme(colors.orange.300/5)_8px,theme(colors.orange.300/5)_12px)]',
    },
    {
      mode: 'running',
      isRunning: true,
      isRetrying: false,
      className:
        '[animation-duration:2000ms] animate-in slide-in-from-left-[34px] repeat-infinite [background:repeating-linear-gradient(-45deg,theme(colors.blue.300),theme(colors.blue.300)_8px,theme(colors.blue.400/5)_8px,theme(colors.blue.400/5)_12px)] ',
    },
  ],
});

export function Progress({
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
  isRunning,
}: PropsWithChildren<{
  start: number;
  end?: number;
  className?: string;
  startTime: number;
  endTime?: number;
  isPending?: boolean;
  isRetrying?: boolean;
  isRunning?: boolean;
  mode?:
    | 'created'
    | 'running'
    | 'scheduled'
    | 'suspended'
    | 'pending'
    | 'succeeded'
    | 'failed'
    | 'killed'
    | 'cancel';
  style?: CSSProperties;
  showDuration?: boolean;
}>) {
  const { isPast, ...parts } = getDuration(endTime - startTime);
  const duration = formatDurations(parts);

  return (
    <div
      className={progressStyles({
        className,
        isPending,
        isRetrying,
        mode,
        isRunning,
      })}
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
      <div className="absolute inset-0 overflow-hidden rounded-md animate-pulse">
        <div
          className={animationStyles({
            mode,
            isRunning,
            isRetrying,
            isPending,
          })}
        />
      </div>
    </div>
  );
}

export function isEntryCall(
  entry: JournalEntry
): entry is CallJournalEntryType | OneWayCallJournalEntryType {
  return Boolean(
    entry.entry_type && ['Call', 'OneWayCall'].includes(entry.entry_type)
  );
}
