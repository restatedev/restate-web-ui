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
      className="max-w-full truncate border-none bg-transparent py-0 text-2xs font-normal text-zinc-500/80"
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
function withStatusTimeline(
  params: {
    suffix?: string;
    prefix?: string;
    tooltipTitle: string;
    field: keyof Invocation;
    condition?: (inv: Invocation) => boolean;
  }[],
) {
  return (props: { invocation: Invocation }) => {
    const index = params.findIndex(
      ({ field, condition }) =>
        props.invocation[field] && (!condition || condition(props.invocation)),
    );
    const param = params.at(index);
    if (!param) {
      return null;
    }
    const { prefix, suffix, field, tooltipTitle } = param;
    const value = props.invocation[field];
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
  succeeded: withStatusTimeline([
    {
      suffix: 'ago',
      tooltipTitle: 'Succeeded at',
      field: 'completed_at',
    },
  ]),
  failed: withStatusTimeline([
    {
      suffix: 'ago',
      tooltipTitle: 'Failed at',
      field: 'completed_at',
    },
  ]),
  cancelled: withStatusTimeline([
    {
      suffix: 'ago',
      tooltipTitle: 'Cancelled at',
      field: 'completed_at',
    },
  ]),
  killed: withStatusTimeline([
    {
      suffix: 'ago',
      tooltipTitle: 'Killed at',
      field: 'completed_at',
    },
  ]),
  'backing-off': withStatusTimeline([
    {
      prefix: 'for',
      field: 'next_retry_at',
      tooltipTitle: 'Will run at',
    },
  ]),
  running: withStatusTimeline([
    {
      prefix: 'Current attempt in progress for',
      field: 'last_start_at',
      tooltipTitle: 'Current attempt in progress since',
      condition: (inv) => Boolean(inv.retry_count && inv.retry_count > 1),
    },
    {
      prefix: 'for',
      field: 'running_at',
      tooltipTitle: 'Running since',
    },
  ]),
  suspended: withStatusTimeline([
    {
      prefix: 'for',
      field: 'modified_at',
      tooltipTitle: 'Suspended at',
    },
  ]),
  scheduled: withStatusTimeline([
    {
      prefix: 'in',
      field: 'scheduled_start_at',
      tooltipTitle: 'Scheduled to run at',
    },
    {
      suffix: 'ago',
      field: 'scheduled_at',
      tooltipTitle: 'Scheduled at',
    },
  ]),
  pending: withStatusTimeline([
    {
      prefix: 'for',
      field: 'inboxed_at',
      tooltipTitle: 'Pending since',
    },
  ]),
  ready: undefined,
};

export function StatusTimeline({ invocation }: { invocation: Invocation }) {
  const Component = STATUS_TIMELINE_COMPONENTS[invocation.status];
  if (!Component) {
    return null;
  }
  return <Component invocation={invocation} />;
}
