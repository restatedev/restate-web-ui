import {
  InputJournalEntryType,
  JournalEntry,
  useGetInvocationJournalWithInvocation,
} from '@restate/data-access/admin-api';
import {
  ComponentType,
  PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Input } from './entries/Input';
import { Target } from './Target';
import { ENTRY_COMPONENTS, ErrorBoundary, getLastFailure } from './Journal';
import { EntryProps } from './entries/types';
import { getRestateError } from './Status';
import { InvocationId } from './InvocationId';
import { createPortal } from 'react-dom';
import { tv } from 'tailwind-variants';
import { formatDurations } from '@restate/util/intl';
import {
  SnapshotTimeProvider,
  useDurationSinceLastSnapshot,
} from '@restate/util/snapshot-time';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';
import { Button } from '@restate/ui/button';
import { HoverTooltip } from '@restate/ui/tooltip';

const inputStyles = tv({
  base: '[&_>*]:leading-7 [--rounded-radius:0.625rem] [--rounded-radius-right:0.25rem] rounded-r text-code w-full',
  variants: {
    hasInputEntry: {
      true: '',
      false: '[&>*]:w-full',
    },
  },
});

export function JournalV2({ invocationId }: { invocationId: string }) {
  const {
    data: journalAndInvocationData,
    isPending,
    error: apiError,
    refetch,
  } = useGetInvocationJournalWithInvocation(String(invocationId), {
    refetchOnMount: false,
  });

  const [first, ...restEntries] =
    journalAndInvocationData?.journal.entries ?? [];

  const inputEntry = first as InputJournalEntryType;
  const timelineContainer = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const callback: MutationCallback = (mutationList) => {
      for (const mutation of mutationList) {
        if (mutation.type === 'childList') {
          setIsMounted(
            Boolean(document.getElementById(getTimelineId(invocationId, 1)))
          );
        }
      }
    };

    const observer = new MutationObserver(callback);
    const element = timelineContainer.current;
    if (element) {
      console.log(element);
      observer.observe(element, {
        childList: true,
      });
    }
    setIsMounted(
      Boolean(document.getElementById(getTimelineId(invocationId, 1)))
    );
    return () => {
      observer.disconnect();
    };
  }, [invocationId]);

  if (isPending) {
    return 'pending';
  }
  if (apiError) {
    return 'error';
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
    journalAndInvocationData.invocation.completed_at ?? new Date().toISOString()
  ).getTime();

  const hasInputEntry = inputEntry?.entry_type === 'Input';

  return (
    <SnapshotTimeProvider lastSnapshot={start}>
      <PanelGroup direction="horizontal" className="mt-8">
        <Panel defaultSize={50} className="pb-4">
          <div className="flex  flex-col items-start gap-1.5">
            <div className="flex items-center gap-1.5 w-full h-7 relative">
              <div className="w-2 bg-zinc-300 absolute left-2.5 h-2 rounded-full">
                <div className="w-px absolute left-1/2 h-8 top-full -translate-x-1/2 border-zinc-300 border border-dashed" />
              </div>
              <div className="shrink-0 text-xs uppercase font-semibold text-gray-400 pl-6">
                Invoked by
              </div>
              {journalAndInvocationData.invocation.invoked_by === 'ingress' ? (
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
                    />
                  )
                );
              })}
            </div>
          </div>
        </Panel>
        <PanelResizeHandle className="w-3 pt-8 pb-4 flex justify-center items-center group">
          <div className="w-px bg-gray-200 h-full group-hover:bg-blue-500" />
        </PanelResizeHandle>
        <Panel defaultSize={50} className="hidden md:flex">
          <div
            ref={timelineContainer}
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
                  href={`/introspection?query=SELECT * FROM sys_journal WHERE id = '${journalAndInvocationData.invocation.id}'`}
                  target="_blank"
                >
                  <Icon name={IconName.ScanSearch} className="w-4 h-4" />
                </Link>
              </HoverTooltip>
            </div>
            <div className="h-[1.875rem] py-1.5 mt-1.5">
              <div className="relative w-full h-full">
                <Progress start={0} end={1} endTime={end} />
              </div>
            </div>
            {restEntries.map((entry) => (
              <div
                id={getTimelineId(
                  journalAndInvocationData.invocation.id,
                  entry.index
                )}
                className="[&:has(*)]:h-7 [&:has(*)]:mt-1.5 "
                key={entry.index}
              />
            ))}
          </div>
        </Panel>
      </PanelGroup>
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
}: EntryProps<JournalEntry> & { start: number; end: number }) {
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
          <SnapshotTimeProvider lastSnapshot={new Date(entry.start).getTime()}>
            <TimelineProtal index={entry.index} invocationId={invocation.id}>
              <div className="leading-7 flex items-center h-full py-2.5">
                <div className="relative w-full h-full rounded-sm bg-zinc-200/50">
                  <Progress
                    start={(new Date(entry.start).getTime() - start) / interval}
                    {...(entry.end && {
                      end: (new Date(entry.end).getTime() - start) / interval,
                      endTime: new Date(entry.end).getTime(),
                    })}
                    {...(!entry.end &&
                      entry.completed === false && {
                        end: (Date.now() - start) / interval,
                        endTime: Date.now(),
                      })}
                    isPending={!completed}
                    isRetrying={isRetryingThisEntry}
                  />
                </div>
              </div>
            </TimelineProtal>
          </SnapshotTimeProvider>
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
  base: 'absolute h-full bg-blue-400 min-w-1 rounded-md',
  variants: {
    isPending: { true: 'animate-pulse', false: '' },
    isRetrying: { true: 'bg-orange-200', false: '' },
  },
});

function Progress({
  start,
  end,
  className,
  endTime,
  children,
  isPending,
  isRetrying,
}: PropsWithChildren<{
  start: number;
  end?: number;
  className?: string;
  endTime?: number;
  isPending?: boolean;
  isRetrying?: boolean;
}>) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();

  const { isPast, ...parts } = durationSinceLastSnapshot(endTime);
  const duration = formatDurations(parts);

  return (
    <div
      className={progressStyles({ className, isPending, isRetrying })}
      style={{
        left: `${start * 100}%`,
        ...(end && {
          right: `${(1 - end) * 100}%`,
        }),
      }}
    >
      <div className="absolute top-full text-2xs text-zinc-500 leading-4">
        {duration}
      </div>
    </div>
  );
}
