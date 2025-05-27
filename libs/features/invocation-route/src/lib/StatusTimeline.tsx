import { Invocation } from '@restate/data-access/admin-api';
import { Badge } from '@restate/ui/badge';
import { DateTooltip } from '@restate/ui/tooltip';
import { formatDurations } from '@restate/util/intl';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { ComponentType } from 'react';

export function Duration({
  prefix,
  suffix,
  date,
  tooltipTitle,
}: {
  prefix?: string;
  suffix?: string;
  date: string;
  tooltipTitle: string;
}) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const duration = formatDurations(durationSinceLastSnapshot(date));

  return (
    <Badge
      size="sm"
      className="text-2xs py-0 bg-transparent border-none text-zinc-500/80 font-normal max-w-full truncate"
    >
      <span className="truncate">
        {prefix && `${prefix} `}
        <DateTooltip date={new Date(date)} title={tooltipTitle}>
          <span className="font-medium text-zinc-500/90">{duration}</span>
        </DateTooltip>
        {suffix && ` ${suffix}`}
      </span>
    </Badge>
  );
}
function withStatusTimeline({
  prefix,
  suffix,
  field,
  tooltipTitle,
}: {
  suffix?: string;
  prefix?: string;
  tooltipTitle: string;
  field: keyof Invocation | (keyof Invocation)[];
}) {
  return (props: { invocation: Invocation }) => {
    const value = Array.isArray(field)
      ? field.map((key) => props.invocation[key]).find(Boolean)
      : props.invocation[field];
    if (typeof value !== 'string') {
      return null;
    }

    return (
      <Duration
        prefix={prefix}
        suffix={suffix}
        tooltipTitle={tooltipTitle}
        date={value}
      />
    );
  };
}

const STATUS_TIMELINE_COMPONENTS: Partial<
  Record<Invocation['status'], ComponentType<{ invocation: Invocation }>>
> = {
  succeeded: withStatusTimeline({
    suffix: 'ago',
    tooltipTitle: 'Succeeded at',
    field: 'completed_at',
  }),
  failed: withStatusTimeline({
    suffix: 'ago',
    tooltipTitle: 'Failed at',
    field: 'completed_at',
  }),
  cancelled: withStatusTimeline({
    suffix: 'ago',
    tooltipTitle: 'Cancelled at',
    field: 'completed_at',
  }),
  killed: withStatusTimeline({
    suffix: 'ago',
    tooltipTitle: 'Killed at',
    field: 'completed_at',
  }),
  'backing-off': withStatusTimeline({
    prefix: 'for',
    field: 'next_retry_at',
    tooltipTitle: 'Will run at',
  }),
  running: withStatusTimeline({
    prefix: 'for',
    field: ['last_start_at', 'running_at'],
    tooltipTitle: 'Running since',
  }),
  suspended: withStatusTimeline({
    prefix: 'for',
    field: 'modified_at',
    tooltipTitle: 'Suspended at',
  }),
  scheduled: withStatusTimeline({
    suffix: 'ago',
    field: 'scheduled_at',
    tooltipTitle: 'Scheduled at',
  }),
  pending: withStatusTimeline({
    prefix: 'for',
    field: 'inboxed_at',
    tooltipTitle: 'Pending since',
  }),
  ready: undefined,
};

export function StatusTimeline({ invocation }: { invocation: Invocation }) {
  const Component = STATUS_TIMELINE_COMPONENTS[invocation.status];
  if (!Component) {
    return null;
  }
  return <Component invocation={invocation} />;
}
