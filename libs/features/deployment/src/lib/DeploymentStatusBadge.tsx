import { Badge } from '@restate/ui/badge';
import { tv } from '@restate/util/styles';

export type DeploymentLifecycleStatus = 'active' | 'drained';

const styles = tv({
  base: 'relative inline-flex max-w-full shrink-0 gap-1.5 py-0.5!',
  variants: {
    status: {
      active: '',
      drained: 'bg-zinc-100 text-zinc-600',
    },
  },
});

const dotStyles = tv({
  base: 'absolute h-2 w-2 rounded-full',
  variants: {
    status: {
      active: 'bg-emerald-500',
      drained: 'bg-zinc-400',
    },
    layer: {
      solid: '',
      pulse: 'animate-ping opacity-40',
    },
  },
  compoundVariants: [
    { status: 'drained', layer: 'pulse', className: 'hidden' },
  ],
});

export function DeploymentStatusBadge({
  status,
  className,
}: {
  status: DeploymentLifecycleStatus;
  className?: string;
}) {
  return (
    <Badge
      variant={status === 'active' ? 'success' : 'default'}
      className={styles({ status, className })}
    >
      <span className="relative flex h-2 w-2 items-center justify-center">
        <span className={dotStyles({ status, layer: 'pulse' })} />
        <span className={dotStyles({ status, layer: 'solid' })} />
      </span>
      {status === 'active' ? 'Active' : 'Drained'}
    </Badge>
  );
}
