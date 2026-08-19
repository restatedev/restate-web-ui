import type { components } from '@restate/data-access/admin-api-spec';
import { Card, CardHeader, CardHeroValue, CardRow } from '@restate/ui/card';
import { IconName } from '@restate/ui/icons';
import { InlineTooltip, RelativeDate } from '@restate/ui/tooltip';
import {
  formatDurations,
  formatNumber,
  normaliseDuration,
  parseISODuration,
} from '@restate/util/intl';

type WorkflowRunStatsResponse =
  components['schemas']['WorkflowRunStatsResponse'];

function formatDuration(value: string) {
  return formatDurations(normaliseDuration(parseISODuration(value)));
}

export function WorkflowStatsCard({
  stats,
}: {
  stats: WorkflowRunStatsResponse;
}) {
  if (!stats.supported) return null;

  return (
    <Card intent="none">
      <CardHeader
        title="Statistics"
        icon={IconName.Layers}
        iconClassName="rotate-90"
      />
      <CardRow variant="hero">
        <div className="min-w-0 flex-auto">
          <div className="text-0.5xs font-medium text-gray-500">
            Workflow duration
          </div>
          <div className="mt-0.5 text-2xs text-gray-400">From first start</div>
        </div>
        <CardHeroValue>
          {stats.duration ? formatDuration(stats.duration) : '—'}
        </CardHeroValue>
      </CardRow>
      {stats.waitingToStartDuration && (
        <CardRow label="Waiting to start">
          <span className="text-xs text-zinc-600 tabular-nums">
            {formatDuration(stats.waitingToStartDuration)}
          </span>
        </CardRow>
      )}
      <CardRow label="Pending promises">
        <span className="text-xs text-zinc-600 tabular-nums">
          {formatNumber(stats.pendingPromiseCount ?? 0)}
        </span>
      </CardRow>
      <CardRow
        label={
          <InlineTooltip
            variant="indicator-button"
            title="Workflow interaction"
            description="The latest invocation of a shared handler for this Workflow instance. The run handler is not included."
          >
            Last interaction
          </InlineTooltip>
        }
      >
        {stats.lastInteractionAt ? (
          <RelativeDate
            date={stats.lastInteractionAt}
            title="Last interaction at"
          />
        ) : (
          <span className="text-xs text-zinc-600">None</span>
        )}
      </CardRow>
    </Card>
  );
}
