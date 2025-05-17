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
import { ComponentType, PropsWithChildren, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { tv } from 'tailwind-variants';
import { EntryProps } from './entries/types';
import { getLastFailure, ENTRY_COMPONENTS, ErrorBoundary } from './Journal';
import { getRestateError } from './Status';
import { Target } from './Target';
import { Input } from './entries/Input';
import { getDuration } from '@restate/util/snapshot-time';
import { useJournalContext } from './JournalContext';

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
  running: 'Running since',
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
  const { start, end, cancelTime, dataUpdatedAt, invocationIds } =
    useJournalContext();
  const { data } = useGetInvocationsJournalWithInvocations(invocationIds, {
    enabled: false,
  });
  const invocation = data?.[invocationId]?.invocation;
  const entries = data?.[invocationId]?.journal?.entries ?? [];

  const [first, ...restEntries] = entries ?? [];
  const inputEntry = first as InputJournalEntryType;
  const hasInputEntry = inputEntry?.entry_type === 'Input';

  if (!invocation) {
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
            <Input
              invocation={invocation}
              entry={inputEntry}
              className="text-xs w-full"
            />
          )}
        </Target>
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
          <div className="h-7 py-1.5">
            <div className="relative w-full h-full flex flex-row rounded-md bg-zinc-200/50">
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
                    className="rounded-md"
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
                      isRunning={
                        ['running', 'retrying'].includes(invocation.status) &&
                        i === lifeCycles.length - 1
                      }
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
                <div className="leading-7 flex items-center h-full py-2.5">
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
                      className="ml-0.5"
                      showDuration
                    >
                      <DateTooltip
                        date={new Date(entry.start)}
                        title="Appended at"
                        className="min-w-2 block h-full rounded-md"
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

function TimelinePortal({
  children,
  index,
  invocationId,
}: PropsWithChildren<{ invocationId: string; index: number }>) {
  const { containerRef } = useJournalContext();
  const element = containerRef?.current?.querySelector(
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
  const { containerRef } = useJournalContext();
  const element = containerRef?.current?.querySelector(
    `[data-id=${getTimelineId(invocationId, 0)}]`
  );

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
  const { containerRef } = useJournalContext();
  const element = containerRef?.current?.querySelector(
    `[data-id=${getEntryId(invocationId, index)}]`
  );

  if (!element) {
    return null;
  }

  return createPortal(children, element);
}

const progressStyles = tv({
  base: 'absolute h-full bg-blue-300 min-w-[2px] rounded-md @container hover:min-w-2 transition-all transform',
  variants: {
    isPending: { true: 'animate-pulse', false: '' },
    isRetrying: { true: 'bg-orange-200', false: '' },
    isRunning: { true: 'animate-pulse ', false: '' },
    mode: {
      suspended:
        '[background:repeating-linear-gradient(to_right,theme(colors.zinc.200),theme(colors.zinc.200)_4px,theme(colors.gray.100)_4px,theme(colors.gray.100)_6px)] border border-dashed border-zinc-200 ',
      running: '',
      pending: 'border-dashed bg-transparent border border-orange-300 ',
      created: 'bg-zinc-300',
      scheduled: 'border border-dashed border-zinc-300/80 bg-gray-100',
      succeeded: 'bg-green-300',
      killed: 'bg-zinc-300',
      failed: 'bg-red-400',
      cancel:
        '[background:repeating-linear-gradient(to_right,theme(colors.blue.300),theme(colors.blue.300)_4px,theme(colors.blue.200)_4px,theme(colors.blue.200)_6px)]',
    },
  },
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
