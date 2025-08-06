import type { Status } from '@restate/features/restate-context';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from 'tailwind-variants';

const miniStyles = tv({
  base: '',
  slots: {
    container: 'relative w-3 h-3 text-xs',
    icon: 'absolute left-0 top-px w-3 h-3 stroke-0 fill-current',
    animation:
      'absolute inset-left-0 top-px w-3 h-3 stroke-[4px] fill-current opacity-20',
  },
  variants: {
    status: {
      PENDING: {
        container: 'text-yellow-500',
        animation: 'animate-ping',
      },
      DEGRADED: {
        container: 'text-yellow-500',
        animation: 'animate-ping',
      },
      HEALTHY: { container: 'text-green-500', animation: 'animate-ping' },
    },
  },
});

export const ICON_NAMES: Record<Status, IconName> = {
  PENDING: IconName.Circle,
  HEALTHY: IconName.Circle,
  DEGRADED: IconName.TriangleAlert,
};

export function StatusIndicator({
  status,
  className,
}: {
  status: Extract<Status, 'PENDING' | 'HEALTHY' | 'DEGRADED'>;
  className?: string;
}) {
  const { container, icon, animation } = miniStyles({ status });

  return (
    <div className={container({ className })} role="status" aria-label={status}>
      <Icon name={ICON_NAMES[status]} className={icon()} />
      <Icon name={ICON_NAMES[status]} className={animation()} />
    </div>
  );
}
