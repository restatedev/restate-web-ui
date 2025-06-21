import {
  JournalEntryV2,
  useGetInvocationJournalWithInvocationV2,
} from '@restate/data-access/admin-api';
import { formatDurations } from '@restate/util/intl';
import { getDuration } from '@restate/util/snapshot-time';
import { CSSProperties, PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';
import { useJournalContext } from './JournalContext';
import { Ellipsis } from '@restate/ui/loading';

const pointStyles = tv({
  base: 'w-[2px] rounded-full h-full relative',
  slots: {
    line: 'absolute left-px top-1/2  rounded-full  h-1 w-1 -translate-x-1/2 -translate-y-1/2',
    circle:
      'absolute left-px top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full h-2.5 w-2.5 bg-inherit border',
  },
  variants: {
    variant: {
      success: {
        line: 'bg-green-600 ',
        circle: 'bg-green-200 border-green-700/20',
      },
      danger: {
        line: 'bg-red-500',
        circle: 'bg-red-50 border-red-600/20',
      },
      warning: {
        line: 'bg-orange-500',
        circle: 'bg-orange-100 border-orange-600/20',
      },
      info: {
        line: 'bg-blue-500',
        circle: 'bg-blue-100 border-blue-700/10',
      },
      default: {
        line: 'bg-zinc-600',
        circle: 'bg-zinc-50 border-zinc-600/10',
      },
    },
  },
  defaultVariants: { variant: 'info' },
});

const pendingStyles = tv({
  base: 'mix-blend-overlay absolute inset-0 [background:repeating-linear-gradient(-45deg,theme(colors.black/.1),theme(colors.black/.1)_8px,theme(colors.white/.30)_8px,theme(colors.white/.30)_16px)] [mask-image:linear-gradient(to_right,transparent_calc(100%-200px),black_100%)]',
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
    line: 'relative h-full rounded',
  },
  variants: {
    variant: {
      success: {
        line: 'bg-green-300 ',
      },
      danger: {
        line: 'bg-red-300',
      },
      warning: {
        line: 'bg-orange-300',
      },
      info: {
        line: 'bg-blue-300',
      },
      default: {
        line: 'bg-zinc-600',
      },
    },
  },
  defaultVariants: { variant: 'info' },
});

function Line({
  className,
  style,
  variant,
  children,
}: PropsWithChildren<{
  className?: string;
  style?: CSSProperties;
  variant?: 'success' | 'info' | 'danger' | 'warning' | 'default';
}>) {
  const { line } = lineStyles({ variant });
  return (
    <div style={style} className={line({ className })}>
      {children}
    </div>
  );
}

const progressStyles = tv({
  base: 'h-full relative flex flex-col gap-0.5 items-start justify-center min-w-[2px] translate-y-[2px]',
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
        base: 'translate-y-1.5',
        segmentContainer: 'h-2',
      },
    },
    isPoint: {
      true: {
        base: 'translate-y-[calc(0.25rem-1px)]',
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

  return 'info';
}

export function EntryProgress({
  className,
  children,
  style,
  showDuration,
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
  const { start, end } = useJournalContext();

  const entryStart = entry?.start ? new Date(entry.start).getTime() : undefined;
  const entryEnd = entry?.end
    ? new Date(entry.end ?? entry.start).getTime()
    : undefined;

  const isPoint = Boolean(!entryEnd && !entry?.isPending);
  const { base, segmentContainer } = progressStyles({
    isPending: entry?.isPending,
    isPoint,
  });
  const executionTime = entry?.start
    ? new Date(entry.end ?? entry.start).getTime() -
      new Date(entry.start).getTime()
    : 0;
  const pendingTime = entry?.start ? end - new Date(entry.start).getTime() : 0;
  const { isPast, ...parts } = getDuration(executionTime);
  const duration = formatDurations(parts);
  const pendingDuration = formatDurations(getDuration(pendingTime));

  const relativeStart = entryStart
    ? (entryStart - start) / (end - start)
    : entryStart;
  const relativeEnd = entryEnd
    ? (entryEnd - start) / (end - start)
    : entry?.isPending
    ? 1
    : undefined;

  return (
    <div
      style={{
        ...style,
        ...(relativeStart && {
          left: `${relativeStart * 100}%`,
        }),
        width: isPoint
          ? '2px'
          : `${((relativeEnd || 0) - (relativeStart || 0)) * 100}%`,
      }}
      className={base({ className })}
    >
      <div className={segmentContainer({})}>
        {isPoint ? (
          <Point variant={getPointVariant(entry)} />
        ) : (
          <Line variant={getLineVariant(entry)}>
            {entry?.isPending && <Pending />}
          </Line>
        )}
      </div>
      <div className="text-xs text-gray-500 ml-auto leading-3 whitespace-nowrap">
        {entry?.isPending ? <Ellipsis>{pendingDuration}</Ellipsis> : duration}
      </div>
    </div>
  );
}
