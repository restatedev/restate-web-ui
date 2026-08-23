import { InvocationStatusBadge, Status } from '@restate/features/invocation-ui';
import { BlockedStatus } from '@restate/features/vqueue-ui';
import { MetricComparison } from '@restate/ui/metric-comparison';
import { tv } from '@restate/util/styles';
import {
  InvocationObjectLockHolderTarget,
  InvocationObjectLockTarget,
  useInvocationObjectLock,
} from './InvocationObjectLock';
import { JourneyInboxPosition } from './InvocationJourneyInbox';
import { JourneyBlockedTimeSummary } from './InvocationJourneyBlockedTime';
import type {
  JourneyBlockedTime,
  InvocationJourneyModel,
  JourneyComparison,
  JourneyCurrentStatus,
  JourneyInboxContext,
  JourneyNodeTiming,
  JourneyPendingAttempt,
  JourneyQueueWait,
  JourneyStatusInvocation,
  JourneyTerminalStatus,
} from './InvocationJourneyModel';
import { JourneyNodeTime } from './InvocationJourneyTime';

function PendingAttemptBlockedStatus({
  pendingAttempt,
}: {
  pendingAttempt: JourneyPendingAttempt;
}) {
  const resource = pendingAttempt.resource;
  const { identity, lockHolder, onOpenChange } =
    useInvocationObjectLock(resource);

  return (
    <BlockedStatus
      reason={pendingAttempt.reason}
      resource={resource}
      blockedDuration={pendingAttempt.blockedDuration}
      objectTarget={
        identity ? (
          <InvocationObjectLockTarget identity={identity} />
        ) : undefined
      }
      lockHolderTarget={
        lockHolder ? (
          <InvocationObjectLockHolderTarget lockHolder={lockHolder} />
        ) : undefined
      }
      onOpenChange={onOpenChange}
    />
  );
}

function JourneyMilestone({
  label,
  timing,
}: {
  label: string;
  timing?: JourneyNodeTiming;
}) {
  return (
    <div className="relative z-10 flex min-h-8 min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="h-3 w-3 shrink-0 rounded-full border border-zinc-300 bg-white shadow-xs"
      />
      <div className="flex min-w-0 flex-1 items-baseline gap-x-1.5 overflow-hidden text-xs whitespace-nowrap">
        <span className="font-medium text-zinc-600">{label}</span>
        {timing && <JourneyNodeTime timing={timing} />}
      </div>
    </div>
  );
}

function QueueWaitSummary({
  value,
  live = false,
  completed = false,
}: {
  value: JourneyQueueWait;
  live?: boolean;
  completed?: boolean;
}) {
  const label = live ? 'Queueing' : 'Queued';

  return (
    <div className="flex min-w-0 items-baseline gap-x-1.5 overflow-hidden text-xs whitespace-nowrap">
      <span className="font-medium text-zinc-500">{label}</span>
      <span className="font-normal text-gray-400">for</span>
      <MetricComparison
        value={value.duration}
        qualifier={live ? 'so far' : undefined}
        ratio={value.ratio}
        label={
          live ? 'Current queue time' : completed ? 'Queued time' : 'Queue wait'
        }
      />
    </div>
  );
}

const queueWaitLeadStyles = tv({
  base: 'relative ml-1.5 flex min-h-8 min-w-0 items-center border-l pl-5.5',
  variants: {
    live: {
      true: 'border-dashed border-gray-300',
      false: 'border-gray-200',
    },
    followsPhase: {
      true: '-mt-1',
    },
  },
});

function QueueWaitLead({
  value,
  live = false,
  completed = false,
}: {
  value: JourneyQueueWait;
  live?: boolean;
  completed?: boolean;
}) {
  return (
    <div className={queueWaitLeadStyles({ live })}>
      <QueueWaitSummary value={value} live={live} completed={completed} />
    </div>
  );
}

function BlockedTimeLead({
  value,
  followsQueue,
}: {
  value: JourneyBlockedTime;
  followsQueue: boolean;
}) {
  return (
    <div
      className={queueWaitLeadStyles({
        live: false,
        followsPhase: followsQueue,
      })}
    >
      <JourneyBlockedTimeSummary value={value} context="phase" />
    </div>
  );
}

export function JourneyStart({
  scenario,
  liveQueueWait = false,
  showQueueWait = true,
}: {
  scenario: InvocationJourneyModel;
  liveQueueWait?: boolean;
  showQueueWait?: boolean;
}) {
  return (
    <>
      <JourneyMilestone label="Created" timing={scenario.createdTiming} />
      {scenario.firstRunnableAfter !== undefined && (
        <JourneyMilestone
          label="Became runnable"
          timing={{ value: `after ${scenario.firstRunnableAfter}` }}
        />
      )}
      {scenario.runnableIn !== undefined && (
        <>
          <div className="ml-1.5 h-3 border-l border-dashed border-gray-300" />
          <JourneyMilestone
            label="Scheduled to run"
            timing={{ value: `in ${scenario.runnableIn}` }}
          />
        </>
      )}
      {showQueueWait && scenario.firstQueueWait && (
        <QueueWaitLead
          value={scenario.firstQueueWait}
          live={liveQueueWait}
          completed={Boolean(
            scenario.pendingAttempt && scenario.attempts === 0,
          )}
        />
      )}
      {scenario.blockedTime && (
        <BlockedTimeLead
          value={scenario.blockedTime}
          followsQueue={Boolean(showQueueWait && scenario.firstQueueWait)}
        />
      )}
    </>
  );
}

export function JourneyComparisonSummary({
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
        label="Lifecycle duration"
      />
    </span>
  );
}

export function PendingTail({
  pendingAttempt,
  inboxState,
  currentStatus,
  currentStatusDuration,
  inbox,
  scenario,
}: {
  pendingAttempt?: JourneyPendingAttempt;
  inboxState?: 'pending' | 'queued';
  currentStatus?: JourneyCurrentStatus;
  currentStatusDuration?: string;
  inbox?: JourneyInboxContext;
  scenario: InvocationJourneyModel;
}) {
  if (!pendingAttempt && !inboxState) return null;

  return (
    <div className="relative ml-1.5 flex min-h-8 min-w-0 items-center border-l border-dashed border-gray-300 pl-3.5">
      <span
        aria-hidden="true"
        className="absolute top-1/2 -left-1.5 h-3 w-3 -translate-y-1/2 rounded-full border border-dashed border-zinc-400 bg-white"
      />
      {pendingAttempt ? (
        <div className="flex min-w-0 items-center gap-x-1.5 overflow-hidden text-xs whitespace-nowrap">
          <span className="shrink-0 font-medium text-zinc-600">
            Next attempt
          </span>
          <PendingAttemptBlockedStatus pendingAttempt={pendingAttempt} />
          {pendingAttempt.duration && (
            <span className="inline-flex shrink-0 items-baseline gap-x-1.5 text-gray-400">
              <span>for</span>
              <MetricComparison
                value={pendingAttempt.duration}
                ratio={pendingAttempt.ratio}
                label="Blocked duration"
              />
            </span>
          )}
        </div>
      ) : inboxState ? (
        <div className="flex min-w-0 items-center gap-x-1.5 overflow-hidden text-xs whitespace-nowrap">
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
            <JourneyInboxPosition scenario={scenario} inbox={inbox} />
          )}
        </div>
      ) : null}
    </div>
  );
}

export function CurrentStateTail({
  statusInvocation,
  duration,
}: {
  statusInvocation: JourneyStatusInvocation;
  duration?: string;
}) {
  return (
    <div className="relative ml-1.5 flex min-h-8 min-w-0 items-center border-l border-dashed border-gray-300 pl-3.5">
      <span
        aria-hidden="true"
        className="absolute top-1/2 -left-1.5 h-3 w-3 -translate-y-1/2 rounded-full border border-dashed border-zinc-400 bg-white"
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

export function TerminalEndpoint({
  status,
  timing,
  connectionSource = 'milestone',
}: {
  status: JourneyTerminalStatus;
  timing?: JourneyNodeTiming;
  connectionSource?: 'attempt-group' | 'milestone';
}) {
  return (
    <div className="relative z-10 flex min-h-8 min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className={endpointConnectorStyles({ source: connectionSource })}
      />
      <span
        aria-hidden="true"
        className="h-3 w-3 shrink-0 rounded-full border border-zinc-300 bg-white shadow-xs"
      />
      <div className="flex min-w-0 flex-1 items-baseline gap-x-1.5 overflow-hidden text-xs whitespace-nowrap">
        <InvocationStatusBadge status={status} />
        {timing && <JourneyNodeTime timing={timing} />}
      </div>
    </div>
  );
}

export function PurgeEndpoint({ timing }: { timing: string }) {
  return (
    <div className="relative z-10 flex min-h-8 min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className={endpointConnectorStyles({ dashed: true })}
      />
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

const endpointConnectorStyles = tv({
  base: 'absolute bottom-[calc(50%+0.375rem)] left-1.5 border-l border-gray-200',
  variants: {
    source: {
      'attempt-group': 'top-0',
      milestone: '-top-2.5',
    },
    dashed: {
      true: 'border-dashed border-gray-300',
      false: '',
    },
  },
  defaultVariants: {
    source: 'milestone',
    dashed: false,
  },
});

const journeyContinuationStyles = tv({
  base: 'ml-1.5 min-h-3 flex-1 border-l',
  variants: {
    active: {
      true: 'border-dashed border-gray-300',
      false: 'border-gray-200',
    },
  },
});

export function JourneyContinuation({ active }: { active: boolean }) {
  return <div aria-hidden className={journeyContinuationStyles({ active })} />;
}
