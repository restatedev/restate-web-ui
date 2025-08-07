import { Status, useRestateContext } from '@restate/features/restate-context';
import { StatusIndicator } from './StatusIndicator';
import { tv } from 'tailwind-variants';

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
        container: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
        icon: 'text-yellow-500',
      },
      DEGRADED: {
        container: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
        icon: 'text-yellow-500',
      },
      HEALTHY: {
        container: 'bg-green-50 text-green-700 ring-green-600/20',
        icon: 'fill-green-500',
      },
    },
  },
});

function isStatusDefined(
  status?: Status,
): status is Extract<Status, 'PENDING' | 'HEALTHY' | 'DEGRADED'> {
  return Boolean(status && ['PENDING', 'HEALTHY', 'DEGRADED'].includes(status));
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
      return <StatusIndicator status={status} className={className} />;
    } else {
      return (
        <div className={container({ className })} role="status">
          <StatusIndicator status={status} />
          {status}
        </div>
      );
    }
  }

  return null;
}
