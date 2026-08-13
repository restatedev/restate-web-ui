import type { VqueueSnapshot } from '@restate/data-access/admin-api-spec';
import { VQueueInboxPopoverContent } from '@restate/features/vqueue-ui';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { MetricComparison } from '@restate/ui/metric-comparison';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { formatNumber } from '@restate/util/intl';
import type {
  InvocationJourneyModel,
  JourneyInboxContext,
} from './InvocationJourneyModel';

function createInboxSnapshot(
  scenario: InvocationJourneyModel,
  inbox: JourneyInboxContext,
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

export function JourneyInboxPosition({
  scenario,
  inbox,
}: {
  scenario: InvocationJourneyModel;
  inbox: JourneyInboxContext;
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
