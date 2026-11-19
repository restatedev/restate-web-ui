import type {
  Invocation,
  InvocationStatus,
  JournalEntryV2,
} from '@restate/data-access-admin-api-spec';
import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access-admin-api-hooks';
import { formatDurations } from '@restate/util-intl';
import { getDuration } from '@restate/util-snapshot-time';
import { CSSProperties, PropsWithChildren, use } from 'react';
import { tv } from '@restate/util-styles';
import { useJournalTimelineContext } from '@restate/features-invocation-ui';
import { useTimelineEngineContext } from '@restate/ui-timeline-zoom';
import { Ellipsis } from '@restate/ui-loading';
import { EntryTooltip } from '@restate/features-invocation-ui';
import { Icon, IconName } from '@restate/ui-icons';
import { isEntryCompletionAmbiguous } from '@restate/features-invocation-ui';
import { ErrorBoundary } from './ErrorBoundry';
import {
  getChildTooltipEntry,
  getSendChildSummary,
  getSendLabel,
  getSendStatusLabel,
  getSendTone,
  getSendTrailLayout,
  toTime,
  type SendChild,
  type SendTone,
} from './sendChild';
import {
  scaleTimelinePercent,
  scaleTimelinePercentFromEnd,
  TIMELINE_ENTRY_DRAW_WINDOW_MARGINS,
  timelineEntrySpanStyle,
} from './TimelineScale';
import {
  SegmentWidthContext,
  type SegmentWidthStore,
  useIsSegmentWide,
} from './segmentWidth';

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
        line: 'bg-success',
        circle: 'border-surface bg-success-muted',
      },
      danger: {
        line: 'bg-danger',
        circle: 'border-surface bg-danger-muted',
      },
      warning: {
        line: 'bg-warning',
        circle: 'border-surface bg-warning-muted',
      },
      info: {
        line: 'bg-info',
        circle: 'border-surface bg-info-muted',
      },
      default: {
        line: 'bg-neutral',
        circle: 'border-surface bg-subtle',
      },
    },
  },
  defaultVariants: { variant: 'info' },
});

const pendingStyles = tv({
  base: 'absolute top-0 right-0 bottom-0 left-[calc(100%-200px)] rounded-md mask-[linear-gradient(to_right,transparent_calc(100%-200px),black_100%)] mix-blend-overlay [background:repeating-linear-gradient(-45deg,--theme(--background-color-shade/15%),--theme(--background-color-shade/15%)_8px,--theme(--background-color-highlight/40%)_8px,--theme(--background-color-highlight/40%)_16px)]',
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
    line: 'relative h-full rounded-md border border-surface/80 bg-linear-to-r via-100% shadow-xs',
  },
  variants: {
    variant: {
      success: {
        line: 'from-success-strong to-success-strong',
      },
      danger: {
        line: 'from-danger-strong to-danger-strong',
      },
      warning: {
        line: 'from-warning-strong to-warning-strong',
      },
      backingOff: {
        line: 'bg-[linear-gradient(to_right,var(--background-color-warning-strong)_calc(100%-200px),--theme(--background-color-warning-strong/0)_100%)]',
      },
      info: {
        line: 'from-info-strong to-info-strong',
      },
      default: {
        line: 'h-3 border-dashed border-neutral-strong/40 bg-transparent *:mix-blend-burn',
      },
      idleWarning: {
        line: 'h-3 border-dashed border-warning-strong/60 from-warning-vivid/10 to-warning-vivid/10',
      },
      idlePending: {
        line: 'h-3 border-dashed border-pending-strong/60 from-pending-vivid/10 to-pending-vivid/10',
      },
      idleNeutral: {
        line: 'h-3 border-dashed border-neutral-strong/40 from-tint to-tint',
      },
    },
    isAmbiguous: {
      true: {
        line: 'to-tint',
      },
      false: {},
    },
  },
  compoundVariants: [
    {
      variant: 'success',
      isAmbiguous: true,
      className: {
        line: 'via-success-strong',
      },
    },
    {
      variant: 'danger',
      isAmbiguous: true,
      className: {
        line: 'via-danger-strong',
      },
    },
    {
      variant: 'warning',
      isAmbiguous: true,
      className: {
        line: 'via-warning-strong',
      },
    },
    {
      variant: 'info',
      isAmbiguous: true,
      className: {
        line: 'via-info-strong',
      },
    },
  ],
  defaultVariants: { variant: 'info', isAmbiguous: false },
});

const DASHED_LINE_VARIANTS = new Set<string | undefined>([
  'default',
  'idleNeutral',
  'idleWarning',
  'idlePending',
]);

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
    | 'idlePending'
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
  base: 'relative flex h-full min-w-[4px] -translate-x-px flex-col items-start justify-center gap-0.5 transition-all duration-300',
  slots: {
    segmentContainer:
      'flex w-full items-center transition-all duration-300 *:w-full',
  },
  variants: {
    hasPastRetries: {
      true: { segmentContainer: 'relative' },
      false: {},
    },
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
  if (entry?.type === 'Killed') {
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
        'Signal',
      ].includes(String(entry?.type))) ||
    entry?.type === 'Output'
  ) {
    return entry.resultType === 'failure' ? 'danger' : 'success';
  }
}

function getLineVariant(
  entry?: JournalEntryV2,
  invocation?: Invocation,
  targetInvocationStatus?: InvocationStatus,
  isTargetInvocationStatusPending?: boolean,
) {
  if (entry?.isRetrying) {
    return invocation?.status === 'backing-off' ? 'backingOff' : 'warning';
  }

  if (entry?.resultType === 'failure') {
    return 'danger';
  }
  if (isTargetInvocationStatusPending) {
    return 'default';
  }
  switch (targetInvocationStatus) {
    case 'suspended':
      return 'idleNeutral';
    case 'paused':
      return 'idleWarning';
    case 'backing-off':
      return 'backingOff';
    case 'pending':
    case 'ready':
    case 'yielded':
      return 'idlePending';
    case 'scheduled':
      return 'default';
  }
  if (
    entry?.type === 'Suspended' ||
    entry?.type === 'Sleep' ||
    entry?.type === 'GetPromise' ||
    entry?.type === 'PeekPromise' ||
    entry?.type === 'Awakeable'
  ) {
    return 'idleNeutral';
  }
  if (entry?.type === 'Pending') {
    return 'idlePending';
  }
  if (entry?.type === 'Paused') {
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
    precomputedRelatedEntries?: JournalEntryV2[];
    targetInvocationStatus?: InvocationStatus;
    isTargetInvocationStatusPending?: boolean;
    drawSendTrail?: boolean;
    isSendChildShown?: boolean;
    sendChild?: SendChild;
    childNow?: number;
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
    hideWhenNarrow: {
      true: '@max-[1rem]/segment:hidden',
      false: '',
    },
  },
  defaultVariants: { isPending: false, hideWhenNarrow: true },
});

const relatedEntryStyles = tv({
  base: 'absolute inset-0',
  variants: {
    hideWhenNarrow: {
      true: '@max-[1rem]/segment:hidden',
      false: '',
    },
  },
  defaultVariants: { hideWhenNarrow: true },
});

function WideSegmentOnly({
  store,
  entry,
  invocation,
  children,
}: PropsWithChildren<{
  store: SegmentWidthStore;
  entry: JournalEntryV2;
  invocation?: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data'];
}>) {
  const span = getEntrySpan(entry, invocation, useJournalTimelineContext());
  const isWide = useIsSegmentWide(
    store,
    span.isPoint ? 0 : (span.relativeEnd || 0) - (span.relativeStart || 0),
  );
  return isWide ? children : null;
}

function InnerEntryProgress({
  className,
  children,
  style,
  showDuration = true,
  entry,
  invocation,
  precomputedRelatedEntries,
  targetInvocationStatus,
  isTargetInvocationStatusPending,
  drawSendTrail,
  isSendChildShown,
  sendChild,
  childNow,
}: PropsWithChildren<{
  entry?: JournalEntryV2;
  className?: string;
  style?: CSSProperties;
  showDuration?: boolean;
  invocation?: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data'];
  precomputedRelatedEntries?: JournalEntryV2[];
  targetInvocationStatus?: InvocationStatus;
  isTargetInvocationStatusPending?: boolean;
  drawSendTrail?: boolean;
  isSendChildShown?: boolean;
  sendChild?: SendChild;
  childNow?: number;
}>) {
  const { dataUpdatedAt, isLive, start, end } = useJournalTimelineContext();

  if (!entry?.start) {
    return null;
  }

  if (drawSendTrail) {
    return (
      <SendTrail
        entry={entry}
        child={sendChild}
        isChildShown={Boolean(isSendChildShown)}
        now={childNow ?? dataUpdatedAt}
      />
    );
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
  const pendingDuration = entry.isPending
    ? formatDurations(getDuration(pendingTime))
    : undefined;

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
          <div className="flex-auto border-b-2 border-dotted border-strong" />
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
          <div className="flex-auto border-b-2 border-dotted border-strong" />
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

  const relevantEntries = precomputedRelatedEntries ?? [];
  const transientErrorTimes =
    relevantEntries
      ?.filter((entry) => entry.type === 'Event: TransientError')
      .map((entry) => (entry.start ? new Date(entry.start).getTime() : 0))
      .filter(Boolean) || [];
  const hasPastRetries =
    transientErrorTimes.length > 0 && !entry.isRetrying && !entry.isPending;
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
  const lineVariant = getLineVariant(
    entry,
    invocation,
    targetInvocationStatus,
    isTargetInvocationStatusPending,
  );
  const isLineDashed = !isPoint && DASHED_LINE_VARIANTS.has(lineVariant);
  const segmentWidthStore = use(SegmentWidthContext);
  const markers = Number(relevantEntries?.length) > 0 && (
    <div
      className={markerStyles({
        isPending: entry.isPending,
        hideWhenNarrow: !segmentWidthStore,
      })}
    >
      {relevantEntries?.map((relevantEntry) => {
        return (
          <InnerEntryProgress
            key={relevantEntry.index}
            entry={relevantEntry}
            invocation={invocation}
            className={relatedEntryStyles({
              hideWhenNarrow: !segmentWidthStore,
            })}
          />
        );
      })}
      {startTransientError &&
        endTransientError &&
        transientErrorTimes.length > 0 && (
          <div
            className="absolute top-px bottom-px max-w-full rounded-full bg-[linear-gradient(to_right,--theme(--background-color-warning-strong/0)_0px,--theme(--background-color-warning-strong/1)_20px,--theme(--background-color-warning-strong/1)_calc(100%-20px),--theme(--background-color-warning-strong/0)_100%)] transition-all duration-300"
            style={{
              left: `max(calc(${scaleTimelinePercent((startTransientError - start) / (end - start))} - 20px), 0px)`,
              right: `max(calc(${scaleTimelinePercentFromEnd((endTransientError - start) / (end - start))} - 20px), ${entryEnd || unambiguousEnd ? scaleTimelinePercentFromEnd((new Date((entryEnd || unambiguousEnd)!).getTime() - start) / (end - start)) : '0%'}, 0px)`,
            }}
          />
        )}
    </div>
  );
  return (
    <>
      <EntryProgressContainer
        entry={entry}
        className={base({ className })}
        invocation={invocation}
        hasDashedLine={isLineDashed}
      >
        <div className={segmentContainer({ hasPastRetries })}>
          {isPoint ? (
            <Point variant={getPointVariant(entry)} />
          ) : (
            <Line
              variant={lineVariant}
              isAmbiguous={entryCompletionIsAmbiguous}
              style={
                isLineDashed ? TIMELINE_ENTRY_DRAW_WINDOW_MARGINS : undefined
              }
            >
              {isPending && (
                <div className="absolute inset-0 overflow-hidden rounded-md">
                  <Pending isLive={isLive} />
                </div>
              )}
            </Line>
          )}
          {hasPastRetries && (
            <span className="absolute top-1/2 -right-2 h-1.5 w-1.5! -translate-y-1/2 rounded-full bg-warning shadow-xs" />
          )}
        </div>
        {showDuration && !isPoint && (
          <div className="ml-auto translate-y-1 font-sans text-xs leading-3 whitespace-nowrap text-muted">
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
          targetInvocationStatus={targetInvocationStatus}
        >
          <div className="h-full w-full" />
        </EntryTooltip>
      </EntryProgressContainer>
      {markers &&
        (segmentWidthStore ? (
          <WideSegmentOnly
            store={segmentWidthStore}
            entry={entry}
            invocation={invocation}
          >
            {markers}
          </WideSegmentOnly>
        ) : (
          <EntryProgressContainer
            className="@container/segment h-0"
            entry={entry}
            invocation={invocation}
          >
            {markers}
          </EntryProgressContainer>
        ))}
    </>
  );
}

function getEntrySpan(
  entry: JournalEntryV2,
  invocation: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data'],
  {
    start,
    end,
    dataUpdatedAt,
  }: { start: number; end: number; dataUpdatedAt: number },
  isCopiedFromRestart?: boolean,
) {
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

  const rangeDuration = end - start;
  const relativeStart = entryStart
    ? (entryStart - start) / rangeDuration
    : entryStart;
  const relativeEnd = entryEnd
    ? (entryEnd - start) / rangeDuration
    : entry?.isPending
      ? (dataUpdatedAt - start) / rangeDuration
      : undefined;
  return { isPoint, relativeStart, relativeEnd };
}

export function hasEntryProgress(
  entry: JournalEntryV2 | undefined,
  invocation: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data'],
  start: number,
  drawSendTrail?: boolean,
) {
  if (!entry?.start) {
    return false;
  }
  return (
    drawSendTrail ||
    entry.type !== 'Event: Paused' ||
    Boolean(
      invocation?.invoked_by === 'restart_as_new' &&
      start &&
      new Date(entry.start).getTime() < start,
    )
  );
}

export function EntryProgressContainer({
  className,
  children,
  style,
  entry,
  invocation,
  isCopiedFromRestart,
  hasDashedLine,
}: PropsWithChildren<{
  entry?: JournalEntryV2;
  className?: string;
  style?: CSSProperties;
  invocation?: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data'];
  isCopiedFromRestart?: boolean;
  hasDashedLine?: boolean;
}>) {
  const timeline = useJournalTimelineContext();

  if (!entry?.start) {
    return null;
  }

  const { isPoint, relativeStart, relativeEnd } = getEntrySpan(
    entry,
    invocation,
    timeline,
    isCopiedFromRestart,
  );

  return (
    <div
      style={{
        ...(relativeStart !== undefined && {
          left: scaleTimelinePercent(relativeStart),
        }),
        width: isPoint
          ? '2px'
          : scaleTimelinePercent((relativeEnd || 0) - (relativeStart || 0)),
        zIndex: isPoint ? 2 : 0,
        ...(hasDashedLine &&
          !isPoint &&
          timelineEntrySpanStyle(
            relativeStart || 0,
            (relativeEnd || 0) - (relativeStart || 0),
          )),
        ...style,
      }}
      className={className}
    >
      {children}
    </div>
  );
}

export const timelineBaselineStyles = tv({
  base: 'pointer-events-none absolute top-1/2 h-px -translate-y-px border-b border-dashed border-strong/70',
  variants: {
    isHidden: { true: 'invisible', false: '' },
  },
});

function useTimelinePosition() {
  const { isLive } = useJournalTimelineContext();
  const {
    coordinateStart: start,
    coordinateEnd: end,
    viewportStart,
    viewportEnd,
    nowMs,
  } = useTimelineEngineContext();
  const margin = (viewportEnd - viewportStart) * 0.05;
  const toPercent = (time: number) =>
    Math.min(1, Math.max(0, (time - start) / Math.max(1, end - start))) * 100;
  return {
    left: (time: number) => `${toPercent(time)}%`,
    right: (time: number) => `${100 - toPercent(time)}%`,
    clamp: (time: number) =>
      Math.min(viewportEnd + margin, Math.max(viewportStart - margin, time)),
    start,
    end,
    nowMs,
    isLive,
    viewportStart,
    viewportEnd,
  };
}

const FADE_OUT =
  'mask-[linear-gradient(to_right,black_calc(100%-72px),transparent)]';

const sendTrailStyles = tv({
  slots: {
    root: 'pointer-events-none absolute inset-y-0 right-2 left-2',
    hoverLayer: 'absolute inset-y-0 right-2 left-2',
    wait: 'absolute top-1/2 h-0 -translate-y-1/2 border-t-[1.5px] border-dashed border-neutral-strong/50',
    trail:
      'absolute top-1/2 h-0 -translate-y-1/2 border-t-[1.5px] border-dashed',
    anchor: 'absolute inset-y-0 w-0',
    arrow:
      'absolute top-1/2 right-0 h-2.5 w-1.5 -translate-y-1/2 overflow-visible fill-none',
    label: 'absolute font-sans text-xs leading-3 whitespace-nowrap text-muted',
    target: 'absolute inset-y-0',
  },
  variants: {
    tone: {
      success: {
        trail: 'border-success-strong/60',
        arrow: 'stroke-(--border-color-success-strong)/60',
      },
      danger: {
        trail: 'border-danger-strong/60',
        arrow: 'stroke-(--border-color-danger-strong)/60',
      },
      info: {
        trail: 'border-info-strong/60',
        arrow: 'stroke-(--border-color-info-strong)/60',
      },
      warning: {
        trail: 'border-warning-strong/70',
        arrow: 'stroke-(--border-color-warning-strong)/70',
      },
      pending: {
        trail: 'border-pending-strong/60',
        arrow: 'stroke-(--border-color-pending-strong)/60',
      },
      neutral: {
        trail: 'border-neutral-strong/50',
        arrow: 'stroke-(--border-color-neutral-strong)/50',
      },
    },
    labelSide: {
      after: { label: 'top-1/2 left-0 ml-2 -translate-y-1/2' },
      below: { label: 'top-[calc(50%+5px)] right-1.5' },
    },
    withStatus: {
      true: { label: 'text-2xs' },
      false: {},
    },
    fadeWait: {
      true: { wait: FADE_OUT },
      false: {},
    },
    fadeTrail: {
      true: { trail: FADE_OUT },
      false: {},
    },
  },
});

const sendNoteStyles = tv({
  base: '',
  variants: {
    tone: {
      success: 'text-success-subtle',
      danger: 'text-danger-subtle',
      info: 'text-info-subtle',
      warning: 'text-warning-subtle',
      pending: 'text-pending-subtle',
      neutral: 'text-inverse',
    },
  },
});

const SEND_POINT_VARIANT: Record<
  SendTone,
  'success' | 'danger' | 'info' | 'warning' | 'default'
> = {
  success: 'success',
  danger: 'danger',
  info: 'info',
  warning: 'warning',
  pending: 'default',
  neutral: 'default',
};

const SEND_LINE_GAP = '10px';
const SEND_POINT_MIN_OFFSET = '4px';

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function SendPoint({ left }: { left: string }) {
  return (
    <span
      className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-muted"
      style={{ left }}
    >
      <Icon name={IconName.Invocation} className="h-full w-full" />
    </span>
  );
}

function SendTrail({
  entry,
  child,
  isChildShown,
  now: statusesNow,
}: {
  entry: JournalEntryV2;
  child?: SendChild;
  isChildShown: boolean;
  now: number;
}) {
  const position = useTimelinePosition();
  const now = position.isLive ? position.nowMs : statusesNow;
  const sendAt = toTime(entry.start) ?? position.start;
  const summary = getSendChildSummary(
    child,
    now,
    'invokeTime' in entry ? entry.invokeTime : undefined,
  );
  const tone = getSendTone(child?.status);
  const sendLeft = position.left(sendAt);
  const visibleStart = position.clamp(position.start);
  const layout =
    summary && !isChildShown
      ? getSendTrailLayout({
          sendAt,
          summary,
          rangeEnd: position.end,
          nowMs: now,
          viewportStart: position.viewportStart,
          viewportEnd: position.viewportEnd,
        })
      : undefined;
  const pointLeft = `calc(${sendLeft} + ${SEND_LINE_GAP} + ${SEND_POINT_MIN_OFFSET})`;
  const styles = sendTrailStyles({
    tone,
    labelSide: layout?.labelSide,
    withStatus: layout?.withStatus,
    fadeWait: layout?.fadeWait,
    fadeTrail: layout?.continuesPastEnd,
  });
  const segmentLeft = (time: number) =>
    `max(${position.left(position.clamp(time))}, calc(${sendLeft} + ${SEND_LINE_GAP}))`;

  return (
    <>
      <div className={styles.root()}>
        <div
          className={timelineBaselineStyles()}
          style={{
            left:
              visibleStart <= position.start
                ? '-0.5rem'
                : position.left(visibleStart),
            right: `calc(${position.right(position.clamp(sendAt))} + ${SEND_LINE_GAP})`,
          }}
        />
        {layout && summary && (
          <>
            {layout.runAt > sendAt && (
              <div
                className={styles.wait()}
                style={{
                  left: segmentLeft(sendAt),
                  right: position.right(position.clamp(layout.runAt)),
                }}
              />
            )}
            <div
              className={styles.trail()}
              style={{
                left: segmentLeft(layout.runAt),
                right: position.right(position.clamp(layout.lineEnd)),
              }}
            />
            <div
              className={styles.anchor()}
              style={{
                left: `max(${position.left(layout.lineEnd)}, ${pointLeft})`,
              }}
            >
              {layout.continuesPastEnd ? (
                <svg viewBox="0 0 6 10" className={styles.arrow()}>
                  <path
                    d="M0.75 0.75 L5.25 5 L0.75 9.25"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <Point
                  variant={SEND_POINT_VARIANT[tone]}
                  className="absolute inset-y-0 left-0"
                />
              )}
              <div className={styles.label()}>
                {getSendLabel(summary, layout)}
              </div>
            </div>
          </>
        )}
        <SendPoint left={sendLeft} />
      </div>
      <div className={styles.hoverLayer()}>
        <div
          className={styles.target()}
          style={{
            left: `calc(${sendLeft} - 0.5rem)`,
            right: layout
              ? `min(${position.right(position.clamp(layout.lineEnd))}, calc(100% - ${pointLeft} - 0.5rem))`
              : `calc(${position.right(sendAt)} - 0.5rem)`,
          }}
        >
          <EntryTooltip
            entry={getChildTooltipEntry(
              entry,
              layout || isChildShown ? summary : undefined,
              now,
            )}
            className="absolute inset-0"
            note={
              <>
                Separate invocation
                {child?.status && (
                  <>
                    {' · '}
                    <span className={sendNoteStyles({ tone })}>
                      {capitalize(getSendStatusLabel(child.status))}
                    </span>
                  </>
                )}
              </>
            }
          >
            <div className="h-full w-full" />
          </EntryTooltip>
        </div>
      </div>
    </>
  );
}
