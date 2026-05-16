import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { formatNumber, formatPlurals } from '@restate/util/intl';
import { tv } from '@restate/util/styles';

const skeletonStyles = tv({
  base: 'animate-pulse bg-gray-200/50',
  variants: {
    size: {
      sm: 'min-w-16',
      md: 'min-w-28',
    },
    variant: {
      default: 'rounded-lg',
      minimal: 'h-6 rounded-full',
    },
  },
  compoundVariants: [
    { variant: 'minimal', size: 'sm', class: 'w-12 min-w-0' },
    { variant: 'minimal', size: 'md', class: 'w-16 min-w-0' },
  ],
  defaultVariants: { size: 'md', variant: 'default' },
});

export function InvocationCountLink({
  href,
  count,
  isLoading,
  isError,
  size,
  variant = 'default',
}: {
  href: string;
  count: number;
  isLoading?: boolean;
  isError?: boolean;
  size?: 'sm' | 'md';
  variant?: 'default' | 'minimal';
}) {
  if (variant === 'minimal') {
    if (isError || (!isLoading && count === 0)) {
      return null;
    }
    if (isLoading) {
      return <div className={skeletonStyles({ size, variant })} />;
    }
    return (
      <Link
        href={href}
        variant="icon"
        className="group inline-flex items-center gap-1 rounded-md bg-black/3 px-1.5 py-0.5 text-xs font-medium text-zinc-500 tabular-nums hover:bg-white hover:text-zinc-700"
      >
        {formatNumber(count, true)}
        <span className="hidden group-hover:inline">invocations</span>
        <Icon
          name={IconName.ChevronRight}
          className="hidden h-4 w-4 group-hover:inline-block"
        />
      </Link>
    );
  }

  if (isError) {
    return (
      <div>
        <br />
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className={skeletonStyles({ size, variant })}>
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
