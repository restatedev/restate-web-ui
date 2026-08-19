import {
  Card,
  CardHeader,
  CardHeroValue,
  CardLinkRow,
  CardRow,
} from '@restate/ui/card';
import { IconName } from '@restate/ui/icons';
import { formatBytes, formatNumber } from '@restate/util/intl';

export function StateStatsCard({
  numKeys,
  totalSize,
  description = 'Stored by this object',
  stateHref,
}: {
  numKeys: number;
  totalSize: number;
  description?: string;
  stateHref?: string;
}) {
  return (
    <Card intent="none">
      <CardHeader title="State" icon={IconName.Database} />
      <CardRow variant="hero">
        <div className="min-w-0 flex-auto">
          <div className="text-0.5xs font-medium text-gray-500">Keys</div>
          <div className="mt-0.5 text-2xs text-gray-400">{description}</div>
        </div>
        <CardHeroValue>{formatNumber(numKeys)}</CardHeroValue>
      </CardRow>
      <CardRow label="Total value size">
        <span className="text-xs text-zinc-600 tabular-nums">
          {formatBytes(totalSize)}
        </span>
      </CardRow>
      {stateHref && (
        <CardLinkRow href={stateHref} aria-label="View state">
          <span className="text-xs font-medium text-zinc-600">View state</span>
        </CardLinkRow>
      )}
    </Card>
  );
}
