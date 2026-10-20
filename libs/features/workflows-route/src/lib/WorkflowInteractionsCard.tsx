import type { components } from '@restate/data-access-admin-api-spec';
import { Card, CardHeader, CardRow } from '@restate/ui-card';
import { IconName } from '@restate/ui-icons';
import { RelativeDate } from '@restate/ui-tooltip';
import { formatNumber } from '@restate/util-intl';
import { WorkflowInteractionTooltip } from './WorkflowInteractionTooltip';

type WorkflowRunStatsResponse =
  components['schemas']['WorkflowRunStatsResponse'];

interface WorkflowInteractionsCardProps {
  stats: WorkflowRunStatsResponse;
}

export function WorkflowInteractionsCard({
  stats,
}: WorkflowInteractionsCardProps) {
  return (
    <Card intent="none">
      <CardHeader
        title="Interactions"
        icon={IconName.Invocation}
        titleAddon={
          <WorkflowInteractionTooltip className="ml-0.5 text-xs text-subtle" />
        }
      />
      <CardRow variant="hero">
        <div className="min-w-0 flex-auto">
          <div className="text-0.5xs font-medium text-muted">
            Last interaction
          </div>
          <div className="mt-0.5 text-2xs text-subtle">
            Most recent retained interaction
          </div>
        </div>
        {stats.lastInteractionAt ? (
          <RelativeDate
            date={stats.lastInteractionAt}
            title="Last interaction at"
            className="text-xl font-semibold tracking-tight text-primary"
          />
        ) : (
          <span className="text-xs text-tertiary">None</span>
        )}
      </CardRow>
      <CardRow label="Pending promises">
        <span className="text-xs text-tertiary tabular-nums">
          {formatNumber(stats.pendingPromiseCount ?? 0)}
        </span>
      </CardRow>
    </Card>
  );
}
