import type { components } from '@restate/data-access/admin-api-spec';
import { Card, CardHeader, CardRow } from '@restate/ui/card';
import { IconName } from '@restate/ui/icons';
import { formatBytes, formatNumber } from '@restate/util/intl';

type VirtualObjectStatsState = components['schemas']['VirtualObjectStatsState'];

export function VirtualObjectStateStatsCard({
  state,
}: {
  state: VirtualObjectStatsState;
}) {
  return (
    <Card intent="none">
      <CardHeader title="State" icon={IconName.Database} />
      <CardRow variant="hero">
        <div className="min-w-0 flex-auto">
          <div className="text-0.5xs font-medium text-gray-500">Keys</div>
          <div className="mt-0.5 text-2xs text-gray-400">
            Stored by this object
          </div>
        </div>
        <span className="shrink-0 text-lg font-semibold text-zinc-700 tabular-nums">
          {formatNumber(state.numKeys)}
        </span>
      </CardRow>
      <CardRow label="Total value size">
        <span className="text-xs text-zinc-600 tabular-nums">
          {formatBytes(state.totalSize)}
        </span>
      </CardRow>
    </Card>
  );
}
