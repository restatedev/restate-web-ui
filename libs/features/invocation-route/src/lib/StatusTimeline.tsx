import { Invocation } from '@restate/data-access/admin-api';
import { Badge } from '@restate/ui/badge';
import { DateTooltip } from '@restate/ui/tooltip';
import { formatDurations } from '@restate/util/intl';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { ComponentType } from 'react';
import { Retention } from './Retention';
import { tv } from '@restate/util/styles';

const styles = tv({
  base: 'max-w-full truncate border-none bg-transparent py-0 text-2xs font-normal text-zinc-500/80',
});
export function Duration({
  prefix,
  suffix,
  date,
  tooltipTitle,
  className,
}: {
  prefix?: string;
  suffix?: string;
  date: string;
  tooltipTitle: string;
  className?: string;
}) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const duration = formatDurations(durationSinceLastSnapshot(date));

  return (
    <Badge size="sm" className={styles({ className })}>
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
  showRetention?: boolean,
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
      <div className="item-center inline-flex max-w-full">
        <Duration
          prefix={prefix}
          suffix={suffix}
          tooltipTitle={tooltipTitle}
          date={value}
          className="shrink-0"
        />
        {showRetention && (
          <Retention
            invocation={props.invocation}
            type="completion"
            prefixForCompletion=", retention "
            prefixForInProgress=", retained "
            className="-ml-1.5 min-w-0 truncate"
          />
        )}
      </div>
    );
  };
}

const STATUS_TIMELINE_COMPONENTS: Partial<
  Record<Invocation['status'], ComponentType<{ invocation: Invocation }>>
> = {
  succeeded: withStatusTimeline(
    [
      {
        suffix: 'ago',
        tooltipTitle: 'Succeeded at',
        field: 'completed_at',
      },
    ],
    true,
  ),
  failed: withStatusTimeline(
    [
      {
        suffix: 'ago',
        tooltipTitle: 'Failed at',
        field: 'completed_at',
      },
    ],
    true,
  ),
  cancelled: withStatusTimeline(
    [
      {
        suffix: 'ago',
        tooltipTitle: 'Cancelled at',
        field: 'completed_at',
      },
    ],
    true,
  ),
  killed: withStatusTimeline(
    [
      {
        suffix: 'ago',
        tooltipTitle: 'Killed at',
        field: 'completed_at',
      },
    ],
    true,
  ),
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
  paused: withStatusTimeline([
    {
      prefix: 'for',
      field: 'modified_at',
      tooltipTitle: 'Paused at',
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
