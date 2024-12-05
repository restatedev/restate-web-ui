import { Invocation } from '@restate/data-access/admin-api';
import { Badge } from '@restate/ui/badge';
import { Icon, IconName } from '@restate/ui/icons';
import { DateTooltip } from '@restate/ui/tooltip';
import { formatDurations } from '@restate/util/intl';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { ComponentType } from 'react';

function withDuration(Component?: ComponentType<{ invocation: Invocation }>) {
  if (!Component) {
    return () => null;
  } else {
    return (props: { invocation: Invocation }) => (
      <Badge
        size="sm"
        className="text-2xs py-0 bg-zinc-100/0 border-none text-zinc-500 font-normal w-full truncate"
      >
        <Icon name={IconName.Timer} className="h-3 w-3 mr-1 shrink-0" />
        <span className="truncate">
          <Component {...props} />
        </span>
      </Badge>
    );
  }
}

function RetryingDuration({ invocation }: { invocation: Invocation }) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const { last_start_at } = invocation;
  if (!last_start_at) {
    return null;
  }

  const duration = formatDurations(durationSinceLastSnapshot(last_start_at));
  return (
    <>
      Last retry in progress for{' '}
      <span className="font-medium">
        <DateTooltip
          date={new Date(last_start_at)}
          title="Last retry in progress since"
        >
          {duration}
        </DateTooltip>
      </span>
    </>
  );
}

const DURATION_COMPONENTS: Partial<
  Record<Invocation['status'], ComponentType<{ invocation: Invocation }>>
> = {
  succeeded: undefined,
  failed: undefined,
  cancelled: undefined,
  killed: undefined,
  retrying: withDuration(RetryingDuration),
  running: undefined,
  suspended: undefined,
  scheduled: undefined,
  pending: undefined,
  ready: undefined,
};

export function Duration({ invocation }: { invocation: Invocation }) {
  const Component = DURATION_COMPONENTS[invocation.status];
  if (!Component) {
    return null;
  }
  return <Component invocation={invocation} />;
}
