import type { components } from '@restate/data-access/admin-api-spec';
import { Card, CardHeader, CardRow } from '@restate/ui/card';
import { IconName } from '@restate/ui/icons';
import { DateTooltip } from '@restate/ui/tooltip';
import {
  formatDurations,
  formatNumber,
  normaliseDuration,
  parseISODuration,
} from '@restate/util/intl';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';

type VirtualObjectStatsResponse =
  components['schemas']['VirtualObjectStatsResponse'];
type VirtualObjectStatsDurationRange =
  components['schemas']['VirtualObjectStatsDurationRange'];

function formatDuration(value: string) {
  return formatDurations(normaliseDuration(parseISODuration(value)));
}

function formatDurationRange(range: VirtualObjectStatsDurationRange) {
  const min = formatDuration(range.min);
  const max = formatDuration(range.max);
  return min === max ? min : `${min}–${max}`;
}

function RelativeDate({ date, title }: { date: string; title: string }) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const duration = formatDurations(durationSinceLastSnapshot(date));
  return (
    <DateTooltip date={new Date(date)} title={title}>
      <time dateTime={date} className="text-xs text-zinc-600 tabular-nums">
        {duration} ago
      </time>
    </DateTooltip>
  );
}

export function VirtualObjectStatsCard({
  stats,
}: {
  stats: VirtualObjectStatsResponse;
}) {
  if (!stats.supported) return null;

  const inboxDuration = stats.averageInboxDuration;
  const oldestInboxedAt = stats.activity?.oldestInboxedAt;
  const lastEnqueuedAt = stats.activity?.lastEnqueuedAt;

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
            Average time inboxed
          </div>
          <div className="mt-0.5 text-2xs text-gray-400">
            {inboxDuration
              ? `Across ${formatNumber(inboxDuration.vqueueCount)} ${inboxDuration.vqueueCount === 1 ? 'VQueue' : 'VQueues'} · includes retries`
              : 'No sampled VQueues'}
          </div>
        </div>
        <span className="shrink-0 text-lg font-semibold text-zinc-700 tabular-nums">
          {inboxDuration ? formatDurationRange(inboxDuration) : '—'}
        </span>
      </CardRow>
      <CardRow label="Inbox">
        <span className="text-xs text-zinc-600 tabular-nums">
          {formatNumber(stats.numInbox ?? 0)} entries
        </span>
      </CardRow>
      {oldestInboxedAt && (stats.numInbox ?? 0) > 0 && (
        <CardRow label="Oldest inboxed">
          <RelativeDate
            date={oldestInboxedAt}
            title="Oldest entry entered Inbox at"
          />
        </CardRow>
      )}
      <CardRow label="Last enqueued">
        {lastEnqueuedAt ? (
          <RelativeDate date={lastEnqueuedAt} title="Last enqueued at" />
        ) : (
          <span className="text-xs text-zinc-600">Never</span>
        )}
      </CardRow>
    </Card>
  );
}
