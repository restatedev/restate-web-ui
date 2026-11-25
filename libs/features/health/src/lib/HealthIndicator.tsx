import { Status, useRestateContext } from '@restate/features-restate-context';
import { IconName } from '@restate/ui-icons';
import { StatusDot, type StatusDotProps } from '@restate/ui-loading';
import { tv } from '@restate/util-styles';

const styles = tv({
  base: '',
  slots: {
    container:
      'inline-flex items-center gap-1 rounded-lg px-2 py-0 text-2xs font-medium ring-1 ring-inset',
    icon: 'h-3 w-3 fill-current stroke-0 text-xs',
  },
  variants: {
    status: {
      PENDING: {
        container: 'bg-pending-subtle text-pending-strong ring-pending/20',
        icon: 'text-pending-subtle',
      },
      DEGRADED: {
        container: 'bg-pending-subtle text-pending-strong ring-pending/20',
        icon: 'text-pending-subtle',
      },
      UNREACHABLE: {
        container: 'bg-pending-subtle text-pending-strong ring-pending/20',
        icon: 'text-pending-subtle',
      },
      HEALTHY: {
        container: 'bg-success-subtle text-success-strong ring-success/20',
        icon: 'fill-success-vivid',
      },
    },
  },
});

type DefinedStatus = Extract<
  Status,
  'PENDING' | 'HEALTHY' | 'DEGRADED' | 'UNREACHABLE'
>;

const DOTS: Record<DefinedStatus, Pick<StatusDotProps, 'intent' | 'icon'>> = {
  PENDING: { intent: 'pending' },
  HEALTHY: { intent: 'success' },
  DEGRADED: { intent: 'pending', icon: IconName.TriangleAlert },
  UNREACHABLE: { intent: 'pending', icon: IconName.TriangleAlert },
};

function isStatusDefined(status?: Status): status is DefinedStatus {
  return Boolean(
    status &&
    ['PENDING', 'HEALTHY', 'DEGRADED', 'UNREACHABLE'].includes(status),
  );
}

export function HealthIndicator({
  mini,
  className,
}: {
  mini?: boolean;
  className?: string;
}) {
  const { status } = useRestateContext();

  if (isStatusDefined(status)) {
    const { container } = styles({ status });

    if (mini) {
      return (
        <StatusDot
          {...DOTS[status]}
          pulse
          label={status}
          className={className}
        />
      );
    } else {
      return (
        <div className={container({ className })} role="status">
          <StatusDot {...DOTS[status]} pulse />
          {status}
        </div>
      );
    }
  }

  return null;
}
