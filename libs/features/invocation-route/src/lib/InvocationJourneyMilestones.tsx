import { InvocationStatusBadge, Status } from '@restate/features/invocation-ui';
import { BlockedStatus } from '@restate/features/vqueue-ui';
import { MetricComparison } from '@restate/ui/metric-comparison';
import { tv } from '@restate/util/styles';
import { JourneyInboxPosition } from './InvocationJourneyInbox';
import type {
  InvocationJourneyModel,
  JourneyComparison,
  JourneyCurrentStatus,
  JourneyInboxContext,
  JourneyPendingAttempt,
  JourneyQueueWait,
  JourneyStatusInvocation,
  JourneyTerminalStatus,
} from './InvocationJourneyModel';

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

function QueueWaitSummary({
  value,
  live = false,
}: {
  value: JourneyQueueWait;
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
  value: JourneyQueueWait;
  live?: boolean;
}) {
  return (
    <div className={queueWaitLeadStyles({ live })}>
      <QueueWaitSummary value={value} live={live} />
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
        label="Journey duration"
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
              <JourneyInboxPosition scenario={scenario} inbox={inbox} />
            )}
          </div>
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

export function TerminalEndpoint({
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

export function PurgeEndpoint({ timing }: { timing: string }) {
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

export function JourneyContinuation({ active }: { active: boolean }) {
  return <div aria-hidden className={journeyContinuationStyles({ active })} />;
}
