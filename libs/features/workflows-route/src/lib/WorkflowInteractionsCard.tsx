import type { components } from '@restate/data-access/admin-api-spec';
import { Card, CardHeader, CardRow } from '@restate/ui/card';
import { IconName } from '@restate/ui/icons';
import { RelativeDate } from '@restate/ui/tooltip';
import { formatNumber } from '@restate/util/intl';
import { WorkflowInteractionTooltip } from './WorkflowInteractionTooltip';

type WorkflowRunStatsResponse =
  components['schemas']['WorkflowRunStatsResponse'];

interface WorkflowInteractionsCardProps {
  stats: WorkflowRunStatsResponse;
}

export function WorkflowInteractionsCard({
  stats,
}: WorkflowInteractionsCardProps) {
  if (!stats.supported) return null;

  return (
    <Card intent="none">
      <CardHeader
        title="Interactions"
        icon={IconName.Invocation}
        titleAddon={
          <WorkflowInteractionTooltip className="ml-0.5 text-xs text-gray-400" />
        }
      />
      <CardRow variant="hero">
        <div className="min-w-0 flex-auto">
          <div className="text-0.5xs font-medium text-gray-500">
            Last interaction
          </div>
          <div className="mt-0.5 text-2xs text-gray-400">
            Most recent retained interaction
          </div>
        </div>
        {stats.lastInteractionAt ? (
          <RelativeDate
            date={stats.lastInteractionAt}
            title="Last interaction at"
            className="text-xl font-semibold tracking-tight text-zinc-800"
          />
        ) : (
          <span className="text-xs text-zinc-600">None</span>
        )}
      </CardRow>
      <CardRow label="Pending promises">
        <span className="text-xs text-zinc-600 tabular-nums">
          {formatNumber(stats.pendingPromiseCount ?? 0)}
        </span>
      </CardRow>
    </Card>
  );
}
