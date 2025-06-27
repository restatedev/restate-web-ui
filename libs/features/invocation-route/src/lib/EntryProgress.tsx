import {
  Invocation,
  JournalEntryV2,
  useGetInvocationJournalWithInvocationV2,
} from '@restate/data-access/admin-api';
import { formatDurations } from '@restate/util/intl';
import { getDuration } from '@restate/util/snapshot-time';
import { CSSProperties, PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';
import { useJournalContext } from './JournalContext';
import { Ellipsis } from '@restate/ui/loading';
import { EntryTooltip } from './EntryTooltip';
import { Icon, IconName } from '@restate/ui/icons';
import { isEntryCompletionAmbiguous } from './entries/isEntryCompletionAmbiguous';

const pointStyles = tv({
  base: 'w-[2px] rounded-full h-full relative ',
  slots: {
    line: 'absolute left-px top-1/2  rounded-full  h-1 w-1 -translate-x-1/2 -translate-y-1/2',
    circle:
      'absolute shadow-sm left-px top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full h-2.5 w-2.5 bg-inherit border',
  },
  variants: {
    variant: {
      success: {
        line: 'bg-green-600 ',
        circle: 'bg-green-200 border-white',
      },
      danger: {
        line: 'bg-red-500',
        circle: 'bg-red-50 border-white',
      },
      warning: {
        line: 'bg-orange-500',
        circle: 'bg-orange-100 border-white',
      },
      info: {
        line: 'bg-blue-500',
        circle: 'bg-blue-100 border-white',
      },
      default: {
        line: 'bg-zinc-400',
        circle: 'bg-zinc-50 border-white',
      },
    },
  },
  defaultVariants: { variant: 'info' },
});

const pendingStyles = tv({
  base: 'mix-blend-overlay rounded-md absolute inset-0 [background:repeating-linear-gradient(-45deg,theme(colors.black/.15),theme(colors.black/.15)_8px,theme(colors.white/.40)_8px,theme(colors.white/.40)_16px)] [mask-image:linear-gradient(to_right,transparent_calc(100%-200px),black_100%)]',
  variants: {
    isLive: {
      true: '[animation-duration:2000ms] animate-in slide-in-from-left-[34px] repeat-infinite',
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
    line: 'relative h-full rounded-md shadow-sm border border-white/80 bg-gradient-to-r',
  },
  variants: {
    variant: {
      success: {
        line: 'from-green-300 to-green-300 ',
      },
      danger: {
        line: 'from-red-300 to-red-300',
      },
      warning: {
        line: 'from-orange-300 to-orange-300',
      },
      info: {
        line: 'from-blue-300 to-blue-300',
      },
      default: {
        line: 'bg-transparent border-dashed [&>*]:mix-blend-color-burn border-zinc-600/40',
      },
      idleWarning: {
        line: 'from-orange-400/10 to-orange-400/10 border-dashed border-orange-600/60',
      },
      idleNeutral: {
        line: 'from-zinc-400/20 to-zinc-400/20 border-dashed border-zinc-600/40',
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
        line: 'via-green-300 ',
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
    | 'idleWarning';
}>) {
  const { line } = lineStyles({ variant, isAmbiguous });
  return (
    <div style={style} className={line({ className })}>
      {children}
    </div>
  );
}

const progressStyles = tv({
  base: 'h-full relative flex flex-col gap-0.5 items-start justify-center min-w-[4px] -translate-x-[1px] ',
  slots: {
    segmentContainer: 'w-full',
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
  if (entry?.type === 'TransientError') {
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

function getLineVariant(entry?: JournalEntryV2) {
  if (entry?.isRetrying) {
    return 'warning';
  }

  if (entry?.resultType === 'failure') {
    return 'danger';
  }
  if (entry?.type === 'Suspended' || entry?.type === 'Sleep') {
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

export function EntryProgress({
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
  const { dataUpdatedAt } = useJournalContext();

  const entryEnd = entry?.end
    ? new Date(entry.end ?? entry.start).getTime()
    : undefined;

  const isPoint = Boolean(!entryEnd && !entry?.isPending);
  const { base, segmentContainer } = progressStyles({
    isPending: entry?.isPending,
    isPoint,
  });
  const { isAmbiguous: entryCompletionIsAmbiguous, unambiguousEnd } =
    isEntryCompletionAmbiguous(entry, invocation);

  const unambiguousEndTime = unambiguousEnd
    ? new Date(unambiguousEnd).getTime()
    : entryEnd;

  const executionTime = entry?.start
    ? new Date(entry.end ?? (isPoint ? entry.start : dataUpdatedAt)).getTime() -
      new Date(entry.start).getTime()
    : 0;
  const pendingTime = entry?.start
    ? dataUpdatedAt - new Date(entry.start).getTime()
    : 0;
  const { isPast, ...parts } = getDuration(executionTime);
  const duration = formatDurations(parts);
  const pendingDuration = formatDurations(getDuration(pendingTime));

  if (entry?.type === 'Scheduled') {
    return (
      <EntryProgressContainer
        entry={entry}
        className={base({ className })}
        style={{ zIndex: 2 }}
        invocation={invocation}
      >
        <div className="flex items-center w-full">
          <div className="flex-auto border-b-2 border-gray-500/30 border-dotted" />
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

  const isPending =
    entry?.isPending &&
    !entryCompletionIsAmbiguous &&
    (!entry.isRetrying || invocation?.status !== 'backing-off');

  return (
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
            variant={getLineVariant(entry)}
            isAmbiguous={entryCompletionIsAmbiguous}
            style={
              {
                '--tw-gradient-via-position':
                  entry?.start && unambiguousEndTime
                    ? `${
                        (unambiguousEndTime - new Date(entry.start).getTime()) /
                        executionTime
                      }%`
                    : '100%',
              } as any
            }
          >
            {isPending && <Pending />}
          </Line>
        )}
      </div>
      {showDuration && !isPoint && (
        <div className="text-xs text-gray-500 ml-auto leading-3 whitespace-nowrap font-sans translate-y-1 ">
          {isPending ? (
            <Ellipsis>{pendingDuration}</Ellipsis>
          ) : entryCompletionIsAmbiguous ? (
            <Icon name={IconName.ClockAlert} className="w-3 h-3" />
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
  );
}

export function EntryProgressContainer({
  className,
  children,
  style,
  entry,
  invocation,
}: PropsWithChildren<{
  entry?: JournalEntryV2;
  className?: string;
  style?: CSSProperties;
  invocation?: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data'];
}>) {
  const { start, end, dataUpdatedAt } = useJournalContext();

  if (!entry || !entry.start) {
    return null;
  }
  const { isAmbiguous: entryCompletionIsAmbiguous } =
    isEntryCompletionAmbiguous(entry, invocation);
  const entryStart = entry?.start ? new Date(entry.start).getTime() : undefined;
  const entryEnd = entryCompletionIsAmbiguous
    ? new Date(String(invocation?.completed_at)).getTime()
    : entry?.end
    ? new Date(entry.end ?? entry.start).getTime()
    : undefined;

  const isPoint = Boolean(!entryEnd && !entry?.isPending);

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
