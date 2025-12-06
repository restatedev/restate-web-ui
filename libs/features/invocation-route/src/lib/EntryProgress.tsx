import type {
  Invocation,
  JournalEntryV2,
} from '@restate/data-access/admin-api';
import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access/admin-api-hooks';
import { formatDurations } from '@restate/util/intl';
import { getDuration } from '@restate/util/snapshot-time';
import { CSSProperties, PropsWithChildren } from 'react';
import { tv } from '@restate/util/styles';
import { useJournalContext } from './JournalContext';
import { Ellipsis } from '@restate/ui/loading';
import { EntryTooltip } from './EntryTooltip';
import { Icon, IconName } from '@restate/ui/icons';
import { isEntryCompletionAmbiguous } from './entries/isEntryCompletionAmbiguous';
import { ErrorBoundary } from './ErrorBoundry';

const pointStyles = tv({
  base: 'relative h-full w-[2px] rounded-full',
  slots: {
    line: 'absolute top-1/2 left-px h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full',
    circle:
      'absolute top-1/2 left-px h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-inherit shadow-xs',
  },
  variants: {
    variant: {
      success: {
        line: 'bg-green-600',
        circle: 'border-white bg-green-200',
      },
      danger: {
        line: 'bg-red-500',
        circle: 'border-white bg-red-50',
      },
      warning: {
        line: 'bg-orange-500',
        circle: 'border-white bg-orange-100',
      },
      info: {
        line: 'bg-blue-500',
        circle: 'border-white bg-blue-100',
      },
      default: {
        line: 'bg-zinc-400',
        circle: 'border-white bg-zinc-50',
      },
    },
  },
  defaultVariants: { variant: 'info' },
});

const pendingStyles = tv({
  base: 'absolute top-0 right-0 bottom-0 left-[calc(100%-200px)] max-w-[223px] rounded-md mask-[linear-gradient(to_right,transparent_calc(100%-200px),black_100%)] mix-blend-overlay transition-all duration-1000 [background:repeating-linear-gradient(-45deg,--theme(--color-black/.15),--theme(--color-black/.15)_8px,--theme(--color-white/.40)_8px,--theme(--color-white/.40)_16px)]',
  variants: {
    isLive: {
      true: 'animate-moveAndGrow',
      false: '',
    },
  },
  defaultVariants: {
    isLive: false,
  },
});

function Pending({
  className,
  isLive,
}: {
  className?: string;
  isLive?: boolean;
}) {
  return <div className={pendingStyles({ className, isLive })} />;
}

function Point({
  className,
  style,
  variant,
}: {
  className?: string;
  style?: CSSProperties;
  variant?: 'success' | 'info' | 'danger' | 'warning' | 'default';
}) {
  const { base, circle, line } = pointStyles({ variant });
  return (
    <div style={style} className={base({ className })}>
      <div className={circle()}></div>
      <div className={line()}></div>
    </div>
  );
}

const lineStyles = tv({
  base: '',
  slots: {
    line: 'relative h-full rounded-md border border-white/80 bg-linear-to-r via-100% shadow-xs',
  },
  variants: {
    variant: {
      success: {
        line: 'from-green-300 to-green-300',
      },
      danger: {
        line: 'from-red-300 to-red-300',
      },
      warning: {
        line: 'from-orange-300 to-orange-300',
      },
      backingOff: {
        line: 'bg-[linear-gradient(to_right,--theme(--color-orange-300)_calc(100%-200px),--theme(--color-orange-300/0)_100%)]',
      },
      info: {
        line: 'from-blue-300 to-blue-300',
      },
      default: {
        line: 'h-3 border-dashed border-zinc-600/40 bg-transparent *:mix-blend-color-burn',
      },
      idleWarning: {
        line: 'h-3 border-dashed border-orange-600/60 from-orange-400/10 to-orange-400/10',
      },
      idleNeutral: {
        line: 'h-3 border-dashed border-zinc-600/40 from-zinc-400/20 to-zinc-400/20',
      },
    },
    isAmbiguous: {
      true: {
        line: 'to-zinc-400/20',
      },
      false: {},
    },
  },
  compoundVariants: [
    {
      variant: 'success',
      isAmbiguous: true,
      className: {
        line: 'via-green-300',
      },
    },
    {
      variant: 'danger',
      isAmbiguous: true,
      className: {
        line: 'via-red-300',
      },
    },
    {
      variant: 'warning',
      isAmbiguous: true,
      className: {
        line: 'via-orange-300',
      },
    },
    {
      variant: 'info',
      isAmbiguous: true,
      className: {
        line: 'via-blue-300',
      },
    },
  ],
  defaultVariants: { variant: 'info', isAmbiguous: false },
});

function Line({
  className,
  style,
  variant,
  children,
  isAmbiguous,
}: PropsWithChildren<{
  className?: string;
  style?: CSSProperties;
  isAmbiguous?: boolean;
  variant?:
    | 'success'
    | 'info'
    | 'danger'
    | 'warning'
    | 'default'
    | 'idleNeutral'
    | 'idleWarning'
    | 'backingOff';
}>) {
  const { line } = lineStyles({ variant, isAmbiguous });
  return (
    <div style={style} className={line({ className })}>
      {children}
    </div>
  );
}

const progressStyles = tv({
  base: 'relative flex h-full min-w-[4px] -translate-x-px flex-col items-start justify-center gap-0.5 transition-all duration-1000',
  slots: {
    segmentContainer:
      'flex w-full items-center transition-all duration-1000 *:w-full',
  },
  variants: {
    isPending: {
      true: {
        base: '',
        segmentContainer: 'h-3.5',
      },
      false: {
        base: '',
        segmentContainer: 'h-2',
      },
    },
    isPoint: {
      true: {
        base: '',
        segmentContainer: '',
      },
      false: {
        base: '',
        segmentContainer: '',
      },
    },
  },
  defaultVariants: {
    isPending: false,
    isPoint: false,
  },
});

function getPointVariant(entry?: JournalEntryV2) {
  if (entry?.type === 'Event: TransientError') {
    return 'warning';
  }
  if (entry?.type === 'Paused') {
    return 'warning';
  }
  if (entry?.type === 'Retrying') {
    return 'warning';
  }
  if (entry?.type === 'Cancel' && entry.category === 'notification') {
    return 'default';
  }

  if (
    (entry?.category === 'notification' &&
      [
        'Call',
        'Sleep',
        'GetPromise',
        'PeekPromise',
        'CompletePromise',
        'CompleteAwakeable',
        'Run',
        'AttachInvocation',
      ].includes(String(entry?.type))) ||
    entry?.type === 'Output'
  ) {
    return entry.resultType === 'failure' ? 'danger' : 'success';
  }
}

function getLineVariant(entry?: JournalEntryV2, invocation?: Invocation) {
  if (entry?.isRetrying) {
    return invocation?.status === 'backing-off' ? 'backingOff' : 'warning';
  }

  if (entry?.resultType === 'failure') {
    return 'danger';
  }
  if (
    entry?.type === 'Suspended' ||
    entry?.type === 'Sleep' ||
    entry?.type === 'Paused'
  ) {
    return 'idleNeutral';
  }
  if (entry?.type === 'Pending') {
    return 'idleWarning';
  }
  if (entry?.type === 'Retrying') {
    return 'warning';
  }
  if (entry?.type === 'Scheduled') {
    return 'default';
  }

  return 'info';
}

const entryProgressStyles = tv({
  base: '[&~&]:hidden',
});
export function EntryProgress(
  props: PropsWithChildren<{
    entry?: JournalEntryV2;
    className?: string;
    style?: CSSProperties;
    showDuration?: boolean;
    invocation?: ReturnType<
      typeof useGetInvocationJournalWithInvocationV2
    >['data'];
  }>,
) {
  return (
    <ErrorBoundary entry={props.entry}>
      <InnerEntryProgress
        {...props}
        className={entryProgressStyles({ className: props.className })}
      />
    </ErrorBoundary>
  );
}

const markerStyles = tv({
  base: 'absolute right-2 left-2',
  variants: {
    isPending: {
      true: 'top-[0.225rem] h-3.5',
      false: 'top-[0.4rem] h-2',
    },
  },
  defaultVariants: { isPending: false },
});

function InnerEntryProgress({
  className,
  children,
  style,
  showDuration = true,
  entry,
  invocation,
}: PropsWithChildren<{
  entry?: JournalEntryV2;
  className?: string;
  style?: CSSProperties;
  showDuration?: boolean;
  invocation?: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data'];
}>) {
  const { dataUpdatedAt, isLive, start, end } = useJournalContext();

  if (!entry?.start) {
    return null;
  }

  const entryEnd = entry?.end
    ? new Date(entry.end ?? entry.start).getTime()
    : undefined;

  const isCopiedFromRestart = Boolean(
    invocation?.invoked_by === 'restart_as_new' &&
      entry.start &&
      start &&
      new Date(entry.start).getTime() < start,
  );

  const isPoint = Boolean(!entryEnd && !entry?.isPending);
  const { base, segmentContainer } = progressStyles({
    isPending: entry?.isPending,
    isPoint,
  });
  const {
    isAmbiguous: entryCompletionIsAmbiguous,
    unambiguousEnd,
    mode,
  } = isEntryCompletionAmbiguous(entry, invocation);

  const executionTime = entry?.start
    ? new Date(
        entry.end ??
          (isPoint ? entry.start : (unambiguousEnd ?? dataUpdatedAt)),
      ).getTime() - new Date(entry.start).getTime()
    : 0;
  const pendingTime = entry?.start
    ? dataUpdatedAt - new Date(entry.start).getTime()
    : 0;
  const { isPast, ...parts } = getDuration(executionTime);
  const duration = formatDurations(parts);
  const pendingDuration = formatDurations(getDuration(pendingTime));

  if (isCopiedFromRestart) {
    return (
      <EntryProgressContainer
        entry={entry}
        className={base({ className })}
        style={{ zIndex: 2 }}
        invocation={invocation}
        isCopiedFromRestart
      >
        <div className="flex w-full items-center">
          <div className="flex-auto border-b-2 border-dotted border-gray-500/30" />
          <div className="">
            <Point variant="default" />
          </div>
        </div>
        <EntryTooltip
          entry={entry}
          invocation={invocation}
          className="absolute h-full w-full"
          isCopiedFromRestart
        >
          <div className="h-full w-full" />
        </EntryTooltip>
      </EntryProgressContainer>
    );
  }

  if (entry?.type === 'Scheduled') {
    return (
      <EntryProgressContainer
        entry={entry}
        className={base({ className })}
        style={{ zIndex: 2 }}
        invocation={invocation}
      >
        <div className="flex w-full items-center">
          <div className="flex-auto border-b-2 border-dotted border-gray-500/30" />
          <div className="">
            <Point variant="default" />
          </div>
        </div>
        <EntryTooltip
          entry={entry}
          invocation={invocation}
          className="absolute h-full w-full"
        >
          <div className="h-full w-full" />
        </EntryTooltip>
      </EntryProgressContainer>
    );
  }

  if (entry.type === 'Event: Paused') {
    return null;
  }

  const relevantEntries =
    entry.relatedIndexes && entry.relatedIndexes.length > 0
      ? invocation?.journal?.entries?.filter(
          (relatedEntry) =>
            typeof relatedEntry.index === 'number' &&
            entry.relatedIndexes?.includes(relatedEntry.index) &&
            !relatedEntry.isPending,
        )
      : [];
  const transientErrorTimes =
    relevantEntries
      ?.filter((entry) => entry.type === 'Event: TransientError')
      .map((entry) => (entry.start ? new Date(entry.start).getTime() : 0))
      .filter(Boolean) || [];
  const startTransientError = Math.min(...transientErrorTimes);
  const endTransientError = Math.max(...transientErrorTimes);

  // TODO: move to middleware
  const isPending =
    entry?.isPending &&
    !entryCompletionIsAmbiguous &&
    !(
      entry.type === 'Run' &&
      entry.category === 'command' &&
      !['running'].includes(String(invocation?.status))
    );
  return (
    <>
      <EntryProgressContainer
        entry={entry}
        className={base({ className })}
        invocation={invocation}
      >
        <div className={segmentContainer({})}>
          {isPoint ? (
            <Point variant={getPointVariant(entry)} />
          ) : (
            <Line
              variant={getLineVariant(entry, invocation)}
              isAmbiguous={entryCompletionIsAmbiguous}
            >
              {isPending && (
                <div className="absolute inset-0 overflow-hidden rounded-md">
                  <Pending isLive={isLive} />
                </div>
              )}
            </Line>
          )}
        </div>
        {showDuration && !isPoint && (
          <div className="ml-auto translate-y-1 font-sans text-xs leading-3 whitespace-nowrap text-gray-500">
            {isPending ? (
              <Ellipsis>{pendingDuration}</Ellipsis>
            ) : entryCompletionIsAmbiguous ? (
              <Icon
                name={mode === 'paused' ? IconName.Pause : IconName.ClockAlert}
                className="h-3 w-3"
              />
            ) : (
              duration
            )}
          </div>
        )}
        <EntryTooltip
          entry={entry}
          invocation={invocation}
          className="absolute h-full w-full"
        >
          <div className="h-full w-full" />
        </EntryTooltip>
      </EntryProgressContainer>
      {Number(relevantEntries?.length) > 0 && (
        <EntryProgressContainer
          className="@container/segment h-0"
          entry={entry}
          invocation={invocation}
        >
          <div className="@max-[1rem]/segment:[&~*]:hidden" />
          <div className={markerStyles({ isPending: entry.isPending })}>
            {relevantEntries?.map((relevantEntry) => {
              return (
                <InnerEntryProgress
                  key={relevantEntry.index}
                  entry={relevantEntry}
                  invocation={invocation}
                  className="absolute inset-0 @max-[1rem]/segment:hidden"
                />
              );
            })}
            {startTransientError &&
              endTransientError &&
              startTransientError !== endTransientError &&
              transientErrorTimes.length > 0 && (
                <div
                  className="absolute top-px bottom-px max-w-full rounded-full bg-[linear-gradient(to_right,--theme(--color-orange-300/0)_0px,--theme(--color-orange-300/1)_20px,--theme(--color-orange-300/1)_calc(100%-20px),--theme(--color-orange-300/0)_100%)] transition-all duration-1000"
                  style={{
                    left: `max(calc(${((startTransientError - start) / (end - start)) * 100}% - 20px), 0px)`,
                    right: `max(calc(${((end - endTransientError) / (end - start)) * 100}% - 20px), 0px)`,
                  }}
                />
              )}
          </div>
        </EntryProgressContainer>
      )}
    </>
  );
}

export function EntryProgressContainer({
  className,
  children,
  style,
  entry,
  invocation,
  isCopiedFromRestart,
}: PropsWithChildren<{
  entry?: JournalEntryV2;
  className?: string;
  style?: CSSProperties;
  invocation?: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data'];
  isCopiedFromRestart?: boolean;
}>) {
  const { start, end, dataUpdatedAt } = useJournalContext();

  if (!entry?.start) {
    return null;
  }

  const { unambiguousEnd } = isEntryCompletionAmbiguous(entry, invocation);
  const entryStart = isCopiedFromRestart
    ? start
    : entry?.start
      ? new Date(entry.start).getTime()
      : undefined;
  const entryEnd = unambiguousEnd
    ? new Date(unambiguousEnd).getTime()
    : entry?.end
      ? new Date(entry.end ?? entry.start).getTime()
      : undefined;

  const isPoint =
    isCopiedFromRestart || Boolean(!entryEnd && !entry?.isPending);

  const relativeStart = entryStart
    ? (entryStart - start) / (end - start)
    : entryStart;
  const relativeEnd = entryEnd
    ? (entryEnd - start) / (end - start)
    : entry?.isPending
      ? (dataUpdatedAt - start) / (end - start)
      : undefined;

  return (
    <div
      style={{
        ...(relativeStart && {
          left: `${relativeStart * 100}%`,
        }),
        width: isPoint
          ? '2px'
          : `${((relativeEnd || 0) - (relativeStart || 0)) * 100}%`,
        zIndex: isPoint ? 2 : 0,
        ...style,
      }}
      className={className}
    >
      {children}
    </div>
  );
}
