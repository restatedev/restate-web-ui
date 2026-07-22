import type { Invocation } from '@restate/data-access/admin-api-spec';
import { tv } from '@restate/util/styles';
import type { PropsWithChildren } from 'react';

const styles = tv({
  base: 'sticky top-3 z-50 mx-5 mt-2 flex items-center gap-3.5 rounded-2xl border bg-linear-to-r px-3 py-3 shadow-[0_1px_2px_-0.5px_--theme(--color-zinc-800/6%),0_12px_28px_-10px_--theme(--color-zinc-800/12%),inset_0_2px_0_0_--theme(--color-white/95%)] backdrop-blur-xl backdrop-saturate-200 transition-colors sm:top-6',
  variants: {
    intent: {
      success:
        'border-green-300/60 from-green-100 from-0% via-white via-50% to-green-50',
      danger:
        'border-red-300/60 from-red-100 from-0% via-white via-50% to-red-50',
      warning:
        'border-orange-300/60 from-orange-100 from-0% via-white via-50% to-orange-50',
      pending:
        'border-amber-300/60 from-amber-100 from-0% via-white via-50% to-amber-50',
      info: 'border-blue-300/60 from-blue-100 from-0% via-white via-50% to-blue-50',
      default:
        'border-gray-300/60 from-gray-200/50 from-0% via-white via-50% to-gray-100',
    },
  },
  defaultVariants: { intent: 'default' },
});

function getIntent(
  invocation?: Invocation,
  status?: string,
): 'success' | 'danger' | 'warning' | 'info' | 'default' | 'pending' {
  if (!invocation && !status) return 'default';
  if (invocation?.isRetrying) return 'warning';
  switch (invocation?.status ?? status) {
    case 'succeeded':
      return 'success';
    case 'failed':
      return 'danger';
    case 'pending':
      return 'pending';
    case 'paused':
    case 'backing-off':
      return 'warning';
    case 'running':
    case 'started':
      return 'info';
    default:
      return 'default';
  }
}

export function InvocationStatusHeader({
  invocation,
  status,
  className,
  children,
}: PropsWithChildren<{
  invocation?: Invocation;
  status?: string;
  className?: string;
}>) {
  return (
    <div
      className={styles({ intent: getIntent(invocation, status), className })}
    >
      {children}
    </div>
  );
}
