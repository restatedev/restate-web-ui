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
      WARNING: {
        container: 'text-yellow-500',
        animation: 'animate-ping',
      },
      DANGER: {
        container: 'text-yellow-500',
        animation: 'animate-ping',
      },
      SUCCESS: { container: 'text-green-500', animation: 'animate-ping' },
      INFO: { container: 'text-blue-400', animation: 'animate-ping' },
    },
  },
});

export const ICON_NAMES: Record<
  'WARNING' | 'SUCCESS' | 'DANGER' | 'INFO',
  IconName
> = {
  WARNING: IconName.Circle,
  SUCCESS: IconName.Circle,
  DANGER: IconName.TriangleAlert,
  INFO: IconName.Circle,
};

export function Indicator({
  status,
  className,
}: {
  status: 'WARNING' | 'SUCCESS' | 'DANGER' | 'INFO';
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
