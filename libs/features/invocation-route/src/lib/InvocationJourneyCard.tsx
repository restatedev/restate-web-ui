import type {
  JournalEntryV2,
  VqueueSnapshot,
} from '@restate/data-access/admin-api-spec';
import {
  COMPACT_DETAIL,
  Entry,
  InvocationStatusBadge,
  JournalEntriesContext,
  Status,
} from '@restate/features/invocation-ui';
import {
  BlockedStatus,
  VQueueInboxPopoverContent,
} from '@restate/features/vqueue-ui';
import { Button } from '@restate/ui/button';
import { Card, CardHeader } from '@restate/ui/card';
import { DropdownSection } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { MetricComparison } from '@restate/ui/metric-comparison';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { formatNumber, formatOrdinals } from '@restate/util/intl';
import { tv } from '@restate/util/styles';
import { Fragment, type ComponentProps, type ReactNode } from 'react';
import { Disclosure, DisclosurePanel, Heading } from 'react-aria-components';

export type ActivityKind =
  | 'errorBackoffs'
  | 'yields'
  | 'pauses'
  | 'suspensions';

export type JourneyCurrentStatus =
  | 'pending'
  | 'scheduled'
  | 'yielded'
  | 'running'
  | 'suspended'
  | 'backing-off'
  | 'paused';

export type JourneyTerminalStatus =
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'killed';

export type JourneyActivityCounts = Record<ActivityKind, number>;

export type JourneyActivityDetail = {
  key: string;
  entry: JournalEntryV2;
  parentCommand?: JournalEntryV2;
};

export type JourneyJournalInvocation = NonNullable<
  ComponentProps<typeof Entry>['invocation']
>;

export type JourneyStatusInvocation = ComponentProps<
  typeof Status
>['invocation'];

export type JourneyActivityDetailGroup = {
  summary?: string;
  items: JourneyActivityDetail[];
  totalItems: number;
  itemNoun?: string;
  emptyMessage?: string;
  invocation?: JourneyJournalInvocation;
};

type AverageRatio = number | string;

export type JourneyPendingAttempt = {
  reason: string;
  duration?: string;
  ratio?: AverageRatio;
};

export type JourneyComparison = {
  elapsed: string;
  ratio?: AverageRatio;
  isFinished: boolean;
};

export type JourneyQueueWait = {
  duration: string;
  ratio?: AverageRatio;
};

export type JourneyInboxContext = {
  position: number;
  total: number;
  waiting: string;
  ratio?: AverageRatio;
};

export type InvocationJourneyModel = {
  key: string;
  createdAgo: string;
  firstRunnableAfter?: string;
  runnableIn?: string;
  attempts: number;
  retryAttempts?: number;
  firstAttemptAgo?: string;
  latestAttemptAgo?: string;
  latestAttemptAfter?: string;
  attemptsDuration?: string;
  activity: JourneyActivityCounts;
  activityDetails?: Partial<Record<ActivityKind, JourneyActivityDetailGroup>>;
  firstQueueWait?: JourneyQueueWait;
  currentStatus?: JourneyCurrentStatus;
  currentStatusInvocation?: JourneyStatusInvocation;
  currentAttemptActive?: boolean;
  currentStatusDuration?: string;
  terminal?: {
    status: JourneyTerminalStatus;
    timing?: string;
  };
  purge?: {
    timing: string;
  };
  pendingAttempt?: JourneyPendingAttempt;
  inboxState?: 'pending' | 'queued';
  comparison: JourneyComparison;
  inbox?: JourneyInboxContext;
  inboxSnapshot?: VqueueSnapshot;
};

type JourneyModel = InvocationJourneyModel;
type CurrentStatus = JourneyCurrentStatus;
type ActivityCounts = JourneyActivityCounts;
type PendingAttempt = JourneyPendingAttempt;
type QueueWait = JourneyQueueWait;
type InboxContext = JourneyInboxContext;

const ACTIVITY_KINDS: Array<{
  key: ActivityKind;
  label: string;
  singular: string;
  plural: string;
}> = [
  {
    key: 'errorBackoffs',
    label: 'Back-offs',
    singular: 'back-off',
    plural: 'back-offs',
  },
  { key: 'yields', label: 'Yields', singular: 'yield', plural: 'yields' },
  { key: 'pauses', label: 'Pauses', singular: 'pause', plural: 'pauses' },
  {
    key: 'suspensions',
    label: 'Suspensions',
    singular: 'suspension',
    plural: 'suspensions',
  },
];

const activityGroupStyles = tv({
  base: 'inline-flex h-5 items-center gap-1 rounded-md border py-0 pr-px pl-1.5 text-2xs font-medium',
  variants: {
    kind: {
      errorBackoffs:
        'border-dashed border-orange-300/60 bg-transparent text-orange-700/80',
      yields:
        'border-dashed border-zinc-300/70 bg-transparent text-zinc-500/90',
      pauses: 'border-orange-200/60 bg-orange-50/30 text-orange-700/80',
      suspensions: 'border-zinc-300/70 bg-zinc-100/50 text-zinc-500',
    },
    countFirst: {
      true: 'pr-1.5 pl-px',
    },
  },
});

const activityButtonStyles = tv({
  base: 'inline-flex h-4 items-center gap-0.5 rounded-sm border border-zinc-300/70 bg-white py-0 pr-0.5 pl-1 text-2xs leading-none font-medium tabular-nums shadow-xs hover:border-zinc-400/70 hover:bg-white pressed:bg-zinc-50',
  variants: {
    kind: {
      errorBackoffs: 'text-orange-800',
      yields: 'text-zinc-600',
      pauses: 'text-orange-800',
      suspensions: 'text-zinc-600',
    },
  },
});

const activityCountStyles = tv({
  base: 'inline-flex h-3.5 min-w-3.5 shrink-0 items-center justify-center rounded-sm border border-zinc-600/5 bg-white/70 px-1 text-2xs leading-none font-medium tabular-nums',
  variants: {
    kind: {
      errorBackoffs: 'text-orange-800',
      yields: 'text-zinc-600',
      pauses: 'text-orange-800',
      suspensions: 'text-zinc-600',
    },
  },
});

function countLabel(value: number, singular: string, plural: string) {
  return `${formatNumber(value)} ${value === 1 ? singular : plural}`;
}

function AttemptEndpoint({
  number,
  label,
  timing,
  status,
  statusInvocation,
}: {
  number: number;
  label?: string;
  timing?: string;
  status?: Extract<CurrentStatus, 'running'>;
  statusInvocation?: JourneyStatusInvocation;
}) {
  return (
    <div className="relative z-10 flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="h-3 w-3 shrink-0 rounded-full border border-zinc-300 bg-white shadow-xs"
      />
      <div className="flex min-w-0 flex-1 items-baseline gap-x-1.5 overflow-hidden text-xs whitespace-nowrap">
        <span className="font-medium text-zinc-700 tabular-nums">
          {label ?? `${formatOrdinals(number)} attempt`}
        </span>
        {status && statusInvocation && (
          <Status invocation={statusInvocation} timeline={false} />
        )}
        {timing && (
          <span className="text-gray-400 tabular-nums">· {timing}</span>
        )}
      </div>
    </div>
  );
}

function JourneyMilestone({
  label,
  timing,
}: {
  label: string;
  timing: string;
}) {
  return (
    <div className="relative z-10 flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="h-3 w-3 shrink-0 rounded-full border border-zinc-300 bg-white shadow-xs"
      />
      <div className="flex min-w-0 flex-1 items-baseline gap-x-1.5 overflow-hidden text-xs whitespace-nowrap">
        <span className="font-medium text-zinc-600">{label}</span>
        <span className="text-gray-400 tabular-nums">· {timing}</span>
      </div>
    </div>
  );
}

function ActivityJournalRows({
  details,
}: {
  details: JourneyActivityDetailGroup;
}) {
  const invocation = details.invocation;
  const journalContext = {
    invocationIds: invocation ? [String(invocation.id)] : [],
    detail: { ...COMPACT_DETAIL, errors: true, lifecycle: true },
    disableExpand: true,
    hideOutput: true,
    disableAwaitingHighlight: true,
  };

  return (
    <JournalEntriesContext.Provider value={journalContext}>
      <div className="overflow-hidden py-1 text-xs">
        {invocation &&
          details.items.map((detail) => (
            <Entry
              key={detail.key}
              entry={detail.entry}
              parentCommand={detail.parentCommand}
              invocation={invocation}
              depth={0}
              compact
              showEventTime
            />
          ))}
      </div>
    </JournalEntriesContext.Provider>
  );
}

function ActivityHistoryButton({
  kind,
  count,
  label,
  visibleLabel,
  plural,
  details,
  displayCount,
  accessibleCount,
  countFirst = false,
  popoverTitle,
  accessibleLabel,
}: {
  kind: ActivityKind;
  count: number;
  label: string;
  visibleLabel?: string;
  plural: string;
  details?: JourneyActivityDetailGroup;
  displayCount?: string;
  accessibleCount?: string;
  countFirst?: boolean;
  popoverTitle?: string;
  accessibleLabel?: string;
}) {
  const visibleCount = displayCount ?? formatNumber(count, true);
  const announcedCount = accessibleCount ?? formatNumber(count);
  const announcedLabel = accessibleLabel ?? label;
  const historyTitle = popoverTitle ?? label;
  const emptyMessage =
    details?.emptyMessage ??
    (kind === 'errorBackoffs'
      ? 'No retained transient-error details are available.'
      : kind === 'suspensions'
        ? 'Waiting-entry details are available for protocol v7 invocations.'
        : `No retained ${plural} are available.`);

  if (kind === 'yields') {
    const countElement = (
      <span
        aria-label={`${label}: ${announcedCount}`}
        className={activityCountStyles({ kind })}
      >
        {visibleCount}
      </span>
    );

    return (
      <span className={activityGroupStyles({ kind, countFirst })}>
        {countFirst ? (
          <>
            {countElement} <span>{visibleLabel ?? label}</span>
          </>
        ) : (
          <>
            <span>{visibleLabel ?? label}</span> {countElement}
          </>
        )}
      </span>
    );
  }

  const history = (
    <Popover>
      <PopoverTrigger>
        <Button
          variant="secondary"
          aria-label={`${announcedLabel}: ${announcedCount}`}
          className={activityButtonStyles({ kind })}
        >
          <span>{visibleCount}</span>
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-2.5 w-2.5 shrink-0 text-gray-500 opacity-70"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(36rem,calc(100vw-2rem))]">
        <DropdownSection
          title={
            <span className="inline-flex items-center gap-1.5">
              <span>{historyTitle}</span>
              <span className={activityCountStyles({ kind })}>
                {displayCount ?? formatNumber(count)}
              </span>
            </span>
          }
          className="max-h-80 overflow-y-auto"
        >
          {details?.summary && (
            <p className="border-b border-gray-100 px-3 py-2 text-2xs leading-4 text-gray-500">
              {details.summary}
            </p>
          )}
          {details?.items.length ? (
            <ActivityJournalRows details={details} />
          ) : (
            <p className="px-3 py-3 text-xs text-gray-400">{emptyMessage}</p>
          )}
          {details && details.totalItems > details.items.length && (
            <p className="border-t border-gray-100 px-3 py-2 text-2xs text-gray-400">
              Showing the latest {formatNumber(details.items.length)} of{' '}
              {formatNumber(details.totalItems)} {details.itemNoun ?? 'events'}.
            </p>
          )}
        </DropdownSection>
      </PopoverContent>
    </Popover>
  );

  return (
    <span className={activityGroupStyles({ kind, countFirst })}>
      {countFirst ? (
        <>
          {history} <span>{visibleLabel ?? label}</span>
        </>
      ) : (
        <>
          <span>{visibleLabel ?? label}</span> {history}
        </>
      )}
    </span>
  );
}

function ActivityCount({
  kind,
  count,
  label,
  visibleLabel,
  countFirst = false,
}: {
  kind: ActivityKind;
  count: number;
  label: string;
  visibleLabel?: string;
  countFirst?: boolean;
}) {
  const countElement = (
    <span
      aria-label={`${label}: ${formatNumber(count)}`}
      className={activityCountStyles({ kind })}
    >
      {formatNumber(count, true)}
    </span>
  );

  return (
    <span className={activityGroupStyles({ kind, countFirst })}>
      {countFirst ? (
        <>
          {countElement} <span>{visibleLabel ?? label}</span>
        </>
      ) : (
        <>
          <span>{visibleLabel ?? label}</span> {countElement}
        </>
      )}
    </span>
  );
}

function QueueWaitSummary({
  value,
  live = false,
}: {
  value: QueueWait;
  live?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-baseline gap-x-1.5 overflow-hidden text-xs whitespace-nowrap">
      <span className="font-medium text-gray-400">
        {live ? 'Queueing' : 'Queue wait'}
      </span>
      <MetricComparison
        value={value.duration}
        qualifier={live ? 'so far' : undefined}
        ratio={value.ratio}
        label={live ? 'Current queue time' : 'Queue wait'}
      />
    </div>
  );
}

const queueWaitLeadStyles = tv({
  base: 'relative ml-1.5 min-w-0 border-l py-2 pl-5',
  variants: {
    live: {
      true: 'border-dashed border-gray-300',
      false: 'border-gray-200',
    },
  },
});

function QueueWaitLead({
  value,
  live = false,
}: {
  value: QueueWait;
  live?: boolean;
}) {
  return (
    <div className={queueWaitLeadStyles({ live })}>
      <QueueWaitSummary value={value} live={live} />
    </div>
  );
}

function JourneyStart({
  scenario,
  liveQueueWait = false,
  showQueueWait = true,
}: {
  scenario: JourneyModel;
  liveQueueWait?: boolean;
  showQueueWait?: boolean;
}) {
  return (
    <>
      <JourneyMilestone label="Created" timing={`${scenario.createdAgo} ago`} />
      {scenario.firstRunnableAfter !== undefined && (
        <>
          <div className="ml-1.5 h-3 border-l border-gray-200" />
          <JourneyMilestone
            label="Became runnable"
            timing={`+${scenario.firstRunnableAfter}`}
          />
        </>
      )}
      {scenario.runnableIn !== undefined && (
        <>
          <div className="ml-1.5 h-3 border-l border-dashed border-gray-300" />
          <JourneyMilestone
            label="Scheduled to run"
            timing={`in ${scenario.runnableIn}`}
          />
        </>
      )}
      {showQueueWait && scenario.firstQueueWait && (
        <QueueWaitLead value={scenario.firstQueueWait} live={liveQueueWait} />
      )}
    </>
  );
}

function JourneyComparisonSummary({
  comparison,
}: {
  comparison: JourneyComparison;
}) {
  const elapsed = comparison.elapsed.replace(/ so far$/, '');

  return (
    <span className="inline-flex min-w-0 items-baseline gap-1.5 text-xs whitespace-nowrap">
      <span className="font-normal text-gray-400">
        {comparison.isFinished ? 'completed in' : 'has taken'}
      </span>{' '}
      <MetricComparison
        value={elapsed}
        qualifier={comparison.isFinished ? undefined : 'so far'}
        ratio={comparison.ratio}
        label="Journey duration"
      />
    </span>
  );
}

function RetryActivityBranch({
  retries,
  backoffs,
  details,
  countFirst = false,
}: {
  retries: number;
  backoffs: number;
  details?: JourneyActivityDetailGroup;
  countFirst?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {retries > 0 && (
        <ActivityHistoryButton
          kind="errorBackoffs"
          count={retries}
          label="Retries"
          visibleLabel={retries === 1 ? 'retry' : 'retries'}
          plural="retries"
          details={details}
          countFirst={countFirst}
          popoverTitle="Transient errors"
        />
      )}
      {!countFirst && retries > 0 && backoffs > 0 && (
        <span aria-hidden="true" className="text-gray-300">
          ·
        </span>
      )}
      {backoffs > 0 && (
        <ActivityCount
          kind="errorBackoffs"
          count={backoffs}
          label="Back-offs"
          visibleLabel={backoffs === 1 ? 'back-off' : 'back-offs'}
          countFirst={countFirst}
        />
      )}
    </div>
  );
}

const activityRowsStyles = tv({
  base: 'min-w-0',
  variants: {
    inline: {
      true: '',
      false: 'py-2.5 pl-5',
    },
  },
  defaultVariants: {
    inline: false,
  },
});

function ActivityRows({
  activity,
  details,
  retryAttempts = 0,
  currentAttemptActive = false,
  inline = false,
}: {
  activity: ActivityCounts;
  details?: Partial<Record<ActivityKind, JourneyActivityDetailGroup>>;
  retryAttempts?: number;
  currentAttemptActive?: boolean;
  inline?: boolean;
}) {
  const visible = ACTIVITY_KINDS.filter(
    ({ key }) => key !== 'errorBackoffs' && activity[key] > 0,
  );
  const errorBackoffs = activity.errorBackoffs;
  const visibleRetries =
    !currentAttemptActive && retryAttempts > 0 ? retryAttempts : 0;
  const hasRetryActivity = visibleRetries > 0 || errorBackoffs > 0;
  if (!hasRetryActivity && visible.length === 0) return null;
  const retryActivityLabel = [
    visibleRetries > 0
      ? countLabel(visibleRetries, 'retry', 'retries')
      : undefined,
    errorBackoffs > 0
      ? countLabel(errorBackoffs, 'back-off', 'back-offs')
      : undefined,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className={activityRowsStyles({ inline })}>
      <div
        role="list"
        aria-label="Lifecycle activity"
        className="flex min-w-0 flex-wrap items-center gap-1.5"
      >
        {hasRetryActivity && (
          <div
            role="listitem"
            aria-label={`Retry activity: ${retryActivityLabel}`}
          >
            <RetryActivityBranch
              retries={visibleRetries}
              backoffs={errorBackoffs}
              details={details?.errorBackoffs}
              countFirst={inline}
            />
          </div>
        )}
        {visible.map(({ key, label, singular, plural }, index) => (
          <Fragment key={key}>
            {!inline && (hasRetryActivity || index > 0) && (
              <span aria-hidden="true" className="self-center text-gray-300">
                ·
              </span>
            )}
            <div
              role="listitem"
              aria-label={`${label}: ${countLabel(activity[key], singular, plural)}`}
            >
              <ActivityHistoryButton
                kind={key}
                count={activity[key]}
                label={label}
                visibleLabel={
                  inline ? (activity[key] === 1 ? singular : plural) : undefined
                }
                plural={plural}
                details={details?.[key]}
                countFirst={inline}
              />
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function PendingTail({
  pendingAttempt,
  inboxState,
  currentStatus,
  currentStatusDuration,
  inbox,
  scenario,
}: {
  pendingAttempt?: PendingAttempt;
  inboxState?: 'pending' | 'queued';
  currentStatus?: CurrentStatus;
  currentStatusDuration?: string;
  inbox?: InboxContext;
  scenario: JourneyModel;
}) {
  if (!pendingAttempt && !inboxState) return null;

  return (
    <div className="relative ml-1.5 min-w-0 border-l border-dashed border-gray-300 py-2.5 pl-3.5">
      <span
        aria-hidden="true"
        className="absolute top-4 -left-1.5 h-3 w-3 rounded-full border border-dashed border-zinc-400 bg-white"
      />
      {pendingAttempt ? (
        <div className="min-w-0 text-xs">
          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
            <span className="shrink-0 font-medium text-zinc-600">
              Next attempt
            </span>
            <BlockedStatus reason={pendingAttempt.reason} />
            {pendingAttempt.duration && (
              <span className="inline-flex shrink-0 items-baseline gap-1 text-zinc-500">
                <span>for</span>
                <MetricComparison
                  value={pendingAttempt.duration}
                  ratio={pendingAttempt.ratio}
                  label="Blocked duration"
                />
              </span>
            )}
          </div>
        </div>
      ) : inboxState ? (
        <div className="min-w-0 text-xs">
          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
            <span className="shrink-0 font-medium text-zinc-600">
              Next attempt
            </span>
            {inboxState === 'pending' && (
              <InvocationStatusBadge status={currentStatus ?? 'pending'} />
            )}
            {currentStatus === 'backing-off' && currentStatusDuration && (
              <span className="shrink-0 text-zinc-500 tabular-nums">
                for {currentStatusDuration}
              </span>
            )}
            {inbox && currentStatus === 'pending' && (
              <InboxPositionPopover scenario={scenario} inbox={inbox} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CurrentStateTail({
  statusInvocation,
  duration,
}: {
  statusInvocation: JourneyStatusInvocation;
  duration?: string;
}) {
  return (
    <div className="relative ml-1.5 min-w-0 border-l border-dashed border-gray-300 py-2.5 pl-3.5">
      <span
        aria-hidden="true"
        className="absolute top-4 -left-1.5 h-3 w-3 rounded-full border border-dashed border-zinc-400 bg-white"
      />
      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden text-xs whitespace-nowrap">
        <Status invocation={statusInvocation} timeline={false} />
        {duration && (
          <span className="shrink-0 text-zinc-500 tabular-nums">
            for {duration}
          </span>
        )}
      </div>
    </div>
  );
}

function TerminalEndpoint({
  status,
  timing,
}: {
  status: JourneyTerminalStatus;
  timing?: string;
}) {
  return (
    <div className="relative z-10 flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="h-3 w-3 shrink-0 rounded-full border border-zinc-300 bg-white shadow-xs"
      />
      <div className="flex min-w-0 flex-1 items-baseline gap-x-1.5 overflow-hidden text-xs whitespace-nowrap">
        <InvocationStatusBadge status={status} />
        {timing && (
          <span className="text-gray-400 tabular-nums">· {timing}</span>
        )}
      </div>
    </div>
  );
}

function PurgeEndpoint({ timing }: { timing: string }) {
  return (
    <div className="relative z-10 flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="h-3 w-3 shrink-0 rounded-full border border-dashed border-zinc-400 bg-white"
      />
      <div className="flex min-w-0 flex-1 items-baseline gap-x-1.5 overflow-hidden text-xs whitespace-nowrap">
        <span className="font-medium text-zinc-500">
          Will be purged from storage
        </span>
        <span className="text-gray-400 tabular-nums">· {timing}</span>
      </div>
    </div>
  );
}

const journeyContinuationStyles = tv({
  base: 'ml-1.5 min-h-3 flex-1 border-l',
  variants: {
    active: {
      true: 'border-dashed border-gray-300',
      false: 'border-gray-200',
    },
  },
});

function JourneyContinuation({ active }: { active: boolean }) {
  return <div aria-hidden className={journeyContinuationStyles({ active })} />;
}

const attemptGroupStyles = tv({
  base: 'mt-1.5 -ml-2.5 min-w-0 overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-[0_1px_3px_rgba(24,24,27,0.04)]',
});

const attemptGroupHeaderStyles = tv({
  base: 'relative flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-gray-100 py-1.5 pl-2.5 text-2xs',
  variants: {
    isCollapsible: {
      true: 'pr-8',
      false: 'pr-2.5',
    },
  },
});

const attemptGroupSummaryStyles = tv({
  base: 'relative z-10 flex min-w-0 flex-wrap items-center gap-1.5',
  variants: {
    isCollapsible: {
      true: 'pointer-events-none',
      false: '',
    },
  },
});

function AttemptGroupHeader({
  attemptLabel,
  attemptsDuration,
  isActive,
  isCollapsible,
  activitySummary,
}: {
  attemptLabel: string;
  attemptsDuration?: string;
  isActive: boolean;
  isCollapsible: boolean;
  activitySummary?: ReactNode;
}) {
  return (
    <div className={attemptGroupHeaderStyles({ isCollapsible })}>
      {isCollapsible && (
        <Heading className="absolute inset-0 z-0">
          <Button
            slot="trigger"
            variant="icon"
            aria-label={`Toggle ${attemptLabel}`}
            className="relative h-full w-full justify-end rounded-xl py-0 pr-2.5 pl-0 text-2xs hover:bg-zinc-50/70 pressed:bg-zinc-100/70"
          >
            <Icon
              name={IconName.ChevronDown}
              className="h-3 w-3 shrink-0 text-gray-500 transition-transform group-expanded:rotate-180"
            />
          </Button>
        </Heading>
      )}
      <div className={attemptGroupSummaryStyles({ isCollapsible })}>
        <span className="shrink-0 font-medium text-gray-500">
          {attemptLabel}
        </span>
        {attemptsDuration && (
          <>
            {' '}
            <span className="shrink-0 text-gray-400">over</span>{' '}
            <span
              aria-label={`Attempts duration: ${attemptsDuration}${isActive ? ' so far' : ''}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-zinc-100 px-1 py-px font-medium text-gray-500 tabular-nums"
            >
              <Icon
                name={IconName.Timer}
                className="h-2.5 w-2.5 text-gray-400"
              />
              {attemptsDuration}
            </span>
            {isActive && (
              <>
                {' '}
                <span className="shrink-0 text-gray-400">so far</span>
              </>
            )}
          </>
        )}
      </div>
      {activitySummary && (
        <>
          {' '}
          <span className="pointer-events-none relative z-10 text-gray-400">
            with
          </span>{' '}
          <div className="relative z-10">{activitySummary}</div>
        </>
      )}
      <span className="pointer-events-none relative z-10 min-w-2 flex-1" />
    </div>
  );
}

function AttemptGroupContent({
  scenario,
  latestAttemptStatus,
}: {
  scenario: JourneyModel;
  latestAttemptStatus?: Extract<CurrentStatus, 'running'>;
}) {
  const firstAttemptTiming =
    scenario.attempts === 1 &&
    latestAttemptStatus &&
    scenario.currentStatusDuration
      ? `for ${scenario.currentStatusDuration}`
      : scenario.firstAttemptAgo
        ? `${scenario.firstAttemptAgo} ago`
        : undefined;
  const latestAttemptTiming =
    latestAttemptStatus && scenario.currentStatusDuration
      ? `for ${scenario.currentStatusDuration}`
      : scenario.latestAttemptAfter
        ? `+${scenario.latestAttemptAfter}`
        : scenario.latestAttemptAgo
          ? `${scenario.latestAttemptAgo} ago`
          : 'just now';

  return (
    <div className="min-w-0 px-2.5 py-2">
      <AttemptEndpoint
        number={1}
        label={scenario.attempts === 1 ? 'Attempt' : undefined}
        timing={firstAttemptTiming}
        status={scenario.attempts === 1 ? latestAttemptStatus : undefined}
        statusInvocation={scenario.currentStatusInvocation}
      />
      {scenario.attempts > 1 && (
        <>
          <div className="relative ml-1.5 h-4 border-l border-gray-200">
            {scenario.attempts > 2 && (
              <span
                aria-hidden="true"
                className="absolute top-1/2 -left-[0.2rem] z-10 -translate-y-1/2 bg-white px-0.5 text-2xs leading-none text-gray-300"
              >
                ⋮
              </span>
            )}
          </div>
          <AttemptEndpoint
            number={scenario.attempts}
            timing={latestAttemptTiming}
            status={latestAttemptStatus}
            statusInvocation={scenario.currentStatusInvocation}
          />
        </>
      )}
    </div>
  );
}

function AttemptGroup({
  scenario,
  latestAttemptStatus,
  activitySummary,
}: {
  scenario: JourneyModel;
  latestAttemptStatus?: Extract<CurrentStatus, 'running'>;
  activitySummary?: ReactNode;
}) {
  const attemptLabel = countLabel(scenario.attempts, 'attempt', 'attempts');
  const isActive = latestAttemptStatus === 'running';
  const header = (
    <AttemptGroupHeader
      attemptLabel={attemptLabel}
      attemptsDuration={scenario.attemptsDuration}
      isActive={isActive}
      isCollapsible={!isActive}
      activitySummary={activitySummary}
    />
  );
  const content = (
    <AttemptGroupContent
      scenario={scenario}
      latestAttemptStatus={latestAttemptStatus}
    />
  );

  if (!isActive) {
    return (
      <div
        role="group"
        aria-label={attemptLabel}
        className={attemptGroupStyles()}
      >
        <Disclosure className="group">
          {header}
          <DisclosurePanel className="h-(--disclosure-panel-height) overflow-clip motion-safe:transition-[height]">
            {content}
          </DisclosurePanel>
        </Disclosure>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={attemptLabel}
      className={attemptGroupStyles()}
    >
      {header}
      {content}
    </div>
  );
}

function AttemptJourney({ scenario }: { scenario: JourneyModel }) {
  const visibleActivity =
    ACTIVITY_KINDS.some(({ key }) => scenario.activity[key] > 0) ||
    Boolean(scenario.retryAttempts);
  const latestAttemptStatus =
    scenario.currentAttemptActive && scenario.currentStatus === 'running'
      ? 'running'
      : undefined;
  const currentTransitionStatus =
    scenario.currentStatus === 'suspended' ||
    scenario.currentStatus === 'paused'
      ? scenario.currentStatus
      : undefined;
  const activitySummary = visibleActivity ? (
    <ActivityRows
      activity={scenario.activity}
      details={scenario.activityDetails}
      retryAttempts={scenario.retryAttempts}
      currentAttemptActive={scenario.currentAttemptActive}
      inline
    />
  ) : null;
  const useAttemptGroup = scenario.attempts > 1 || visibleActivity;
  if (scenario.attempts === 0) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3 py-3">
        <JourneyStart
          scenario={scenario}
          liveQueueWait
          showQueueWait={!scenario.inboxState || !scenario.inbox}
        />
        <PendingTail
          pendingAttempt={scenario.pendingAttempt}
          inboxState={scenario.inboxState}
          currentStatus={scenario.currentStatus}
          currentStatusDuration={scenario.currentStatusDuration}
          inbox={scenario.inbox}
          scenario={scenario}
        />
        <JourneyContinuation active />
      </div>
    );
  }

  if (
    scenario.attempts === 1 &&
    !scenario.currentStatus &&
    !scenario.terminal &&
    !scenario.pendingAttempt &&
    !scenario.inboxState
  ) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3 py-3">
        <JourneyStart scenario={scenario} />
        <AttemptEndpoint
          number={1}
          label="Attempt"
          timing={
            scenario.firstAttemptAgo
              ? `${scenario.firstAttemptAgo} ago`
              : undefined
          }
        />
        <JourneyContinuation active={false} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3 py-3">
      <JourneyStart scenario={scenario} />
      {useAttemptGroup ? (
        <AttemptGroup
          scenario={scenario}
          latestAttemptStatus={latestAttemptStatus}
          activitySummary={activitySummary}
        />
      ) : (
        <AttemptEndpoint
          number={1}
          label="Attempt"
          timing={
            latestAttemptStatus && scenario.currentStatusDuration
              ? `for ${scenario.currentStatusDuration}`
              : scenario.firstAttemptAgo
                ? `${scenario.firstAttemptAgo} ago`
                : undefined
          }
          status={latestAttemptStatus}
          statusInvocation={scenario.currentStatusInvocation}
        />
      )}
      {scenario.terminal && (
        <>
          <div className="ml-1.5 h-3 border-l border-gray-200" />
          <TerminalEndpoint {...scenario.terminal} />
          {scenario.purge && (
            <>
              <div className="ml-1.5 h-3 border-l border-dashed border-gray-300" />
              <PurgeEndpoint {...scenario.purge} />
            </>
          )}
        </>
      )}
      {currentTransitionStatus && scenario.currentStatusInvocation && (
        <CurrentStateTail
          statusInvocation={scenario.currentStatusInvocation}
          duration={scenario.currentStatusDuration}
        />
      )}
      <PendingTail
        pendingAttempt={scenario.pendingAttempt}
        inboxState={scenario.inboxState}
        currentStatus={scenario.currentStatus}
        currentStatusDuration={scenario.currentStatusDuration}
        inbox={scenario.inbox}
        scenario={scenario}
      />
      {!scenario.terminal && <JourneyContinuation active />}
    </div>
  );
}

function createInboxSnapshot(
  scenario: JourneyModel,
  inbox: InboxContext,
): VqueueSnapshot {
  const waitingSeconds = Number.parseFloat(inbox.waiting);
  const now = Date.now();
  const firstRunnableAt = Number.isFinite(waitingSeconds)
    ? new Date(now - waitingSeconds * 1000).toISOString()
    : undefined;
  const averageQueueSeconds =
    Number.isFinite(waitingSeconds) &&
    typeof inbox.ratio === 'number' &&
    inbox.ratio > 0
      ? waitingSeconds / inbox.ratio
      : undefined;

  return {
    identity: {
      service: 'ExampleService',
      isPaused: false,
      vqueueId: `vq_mock_${scenario.key}`,
    },
    status: {
      blocked: false,
      scheduling: 'ready',
    },
    counts: {
      inbox: inbox.total,
      running: 0,
      suspended: 0,
      paused: 0,
      finished: 0,
    },
    stageAvg: {
      queue:
        averageQueueSeconds !== undefined
          ? `PT${averageQueueSeconds}S`
          : undefined,
    },
    events: {},
    head: {
      entryId: `inv_mock_${scenario.key}_head`,
      stage: 'inbox',
      status: 'new',
      totalBlocks: [],
      nowBlocks: [],
      avgBlocks: [],
    },
    focusEntry: {
      id: `inv_mock_${scenario.key}`,
      stage: 'inbox',
      status: scenario.currentStatus === 'yielded' ? 'yielded' : 'new',
      position: inbox.position,
      attempts: scenario.attempts,
      firstRunnableAt,
      totalBlocks: [],
      latestBlocks: [],
    },
  };
}

function InboxPositionPopover({
  scenario,
  inbox,
}: {
  scenario: JourneyModel;
  inbox: InboxContext;
}) {
  const snapshot =
    scenario.inboxSnapshot ?? createInboxSnapshot(scenario, inbox);
  const entriesAhead = Math.max(0, inbox.position - 1);
  const entriesLabel = entriesAhead === 1 ? 'entry' : 'entries';
  return (
    <span className="inline-flex min-w-0 items-center gap-1 text-2xs whitespace-nowrap text-gray-400">
      <span>behind</span>
      <Popover>
        <PopoverTrigger>
          <Button
            variant="secondary"
            aria-label={`Open Inbox order: ${formatNumber(entriesAhead)} ${entriesLabel} ahead, in queue ${inbox.waiting}`}
            className="inline-flex h-5 min-w-0 items-center gap-1 rounded-md border-gray-200/80 bg-white/70 px-1.5 py-0.5 text-2xs font-medium text-zinc-700 shadow-none"
          >
            <span className="tabular-nums">
              {formatNumber(entriesAhead)} {entriesLabel}
            </span>
            <Icon
              name={IconName.ChevronsUpDown}
              className="h-3 w-3 shrink-0 text-gray-400"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-fit max-w-[min(48rem,calc(100vw-2rem))] min-w-[min(22rem,calc(100vw-2rem))]">
          <VQueueInboxPopoverContent data={snapshot} />
        </PopoverContent>
      </Popover>
      <span>· in queue</span>
      <MetricComparison
        value={inbox.waiting}
        ratio={inbox.ratio}
        label="Current queue time"
      />
    </span>
  );
}

export function InvocationJourneyCard({
  model,
}: {
  model: InvocationJourneyModel;
}) {
  return (
    <Card intent="none">
      <CardHeader title="Journey" icon={IconName.History}>
        <JourneyComparisonSummary comparison={model.comparison} />
      </CardHeader>
      <AttemptJourney scenario={model} />
    </Card>
  );
}
