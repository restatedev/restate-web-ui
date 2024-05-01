import { Environment } from '@restate/data-access/cloud/api-client';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from 'tailwind-variants';

interface EnvironmentStatusProps {
  status?: Environment['status'];
}

const miniStyles = tv({
  base: '',
  slots: {
    container: 'relative w-3 h-3 text-xs',
    icon: 'absolute left-0 top-[1px] w-3 h-3 stroke-0 fill-current',
    animation:
      'absolute inset-left-0 top-[1px] w-3 h-3 stroke-[4px] fill-current opacity-20',
  },
  variants: {
    status: {
      PENDING: {
        icon: 'text-yellow-500 stroke-[4px]',
        animation: 'animate-ping',
      },
      ACTIVE: { container: 'text-green-500', animation: 'animate-ping' },
      FAILED: { container: 'text-red-500', animation: 'animate-ping' },
      DELETED: { container: 'text-gray-400', animation: 'hidden' },
    },
  },
});

const ICON_NAMES: Record<Environment['status'], IconName> = {
  PENDING: IconName.CircleDotDashed,
  ACTIVE: IconName.Circle,
  FAILED: IconName.TriangleAlert,
  DELETED: IconName.Circle,
};

export function MiniEnvironmentStatus({ status }: EnvironmentStatusProps) {
  if (!status) {
    return null;
  }
  const { container, icon, animation } = miniStyles();

  return (
    <div className={container({ status })}>
      <Icon name={ICON_NAMES[status]} className={icon({ status })} />
      <Icon name={ICON_NAMES[status]} className={animation({ status })} />
    </div>
  );
}

const styles = tv({
  base: '',
  slots: {
    container:
      'inline-flex gap-1 items-center rounded-md px-2 py-0 text-2xs font-medium ring-1 ring-inset',
    icon: 'w-3 h-3 text-xs stroke-0 fill-current',
  },
  variants: {
    status: {
      PENDING: {
        container: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
        icon: 'text-yellow-500 stroke-[4px]',
      },
      ACTIVE: {
        container: 'bg-green-50 text-green-700 ring-green-600/20',
        icon: 'fill-green-500',
      },
      FAILED: {
        container: 'bg-red-50 text-red-700 ring-red-600/10',
        icon: 'fill-red-500',
      },
      DELETED: {
        container: 'bg-gray-50 text-gray-600 ring-gray-500/10',
        icon: 'fill-gray-400',
      },
    },
  },
});

export function EnvironmentStatus({ status }: EnvironmentStatusProps) {
  if (!status) {
    return null;
  }
  const { container, icon } = styles();

  return (
    <div className={container({ status })}>
      <Icon name={ICON_NAMES[status]} className={icon({ status })} />
      {status}
    </div>
  );
}
