import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { formatNumber, formatPlurals } from '@restate/util/intl';
import { tv } from '@restate/util/styles';

const skeletonStyles = tv({
  base: 'animate-pulse rounded-lg bg-gray-200/50',
  variants: {
    size: {
      sm: 'min-w-16',
      md: 'min-w-28',
    },
  },
  defaultVariants: { size: 'md' },
});

export function InvocationCountLink({
  href,
  count,
  isLoading,
  isError,
  size,
}: {
  href: string;
  count: number;
  isLoading?: boolean;
  isError?: boolean;
  size?: 'sm' | 'md';
}) {
  if (isError) {
    return (
      <div>
        <br />
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className={skeletonStyles({ size })}>
        <br />
      </div>
    );
  }
  if (count > 0) {
    return (
      <Link
        href={href}
        variant="secondary"
        className="relative z-10 inline-flex w-auto min-w-0 items-center gap-0.5 truncate rounded-lg border-none bg-transparent px-1.5 py-0.5 text-0.5xs text-zinc-500 no-underline shadow-none hover:bg-black/3 hover:text-zinc-700"
      >
        {formatNumber(count, true)}{' '}
        {formatPlurals(count, { one: 'invocation', other: 'invocations' })}
        <Icon name={IconName.ChevronRight} className="h-4 w-4" />
      </Link>
    );
  }
  return (
    <div className="z-10 inline-flex min-w-0 items-center px-1.5 py-0.5 text-0.5xs text-gray-400">
      No invocations
    </div>
  );
}
