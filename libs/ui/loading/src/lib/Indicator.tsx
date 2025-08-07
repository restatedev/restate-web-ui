import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';

const miniStyles = tv({
  base: '',
  slots: {
    container: 'relative h-3 w-3 text-xs',
    icon: 'absolute top-px left-0 h-3 w-3 fill-current stroke-0',
    animation:
      'inset-left-0 absolute top-px h-3 w-3 fill-current stroke-[4px] opacity-20',
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
