import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { tv } from '@restate/util/styles';
import { focusRing } from '@restate/ui/focus';
import { Link } from '@restate/ui/link';

export const cellsContainerStyles = tv({
  extend: focusRing,
  base: '@container relative isolate cursor-default overflow-hidden rounded-2xl border border-white/60 bg-gray-200/50 shadow-[inset_0_-0.5px_0px_1px_rgba(0,0,0,0.05)] transition',
  variants: {
    issueSeverity: {
      none: '',
      low: 'before:pointer-events-none before:absolute before:inset-y-[2px] before:right-[2px] before:-left-6 before:z-10 before:animate-stripeScroll before:bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,--theme(--color-orange-500/6%)_8px,--theme(--color-orange-500/6%)_16px)] before:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)] after:pointer-events-none after:absolute after:inset-[2px] after:z-10 after:rounded-2xl after:bg-[linear-gradient(to_top_left,transparent_40%,--theme(--color-orange-500/5%))] after:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)]',
      high: 'before:pointer-events-none before:absolute before:inset-y-[2px] before:right-[2px] before:-left-6 before:z-10 before:animate-stripeScroll before:bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,--theme(--color-red-500/6%)_8px,--theme(--color-red-500/6%)_16px)] before:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)] after:pointer-events-none after:absolute after:inset-[2px] after:z-10 after:rounded-2xl after:bg-[linear-gradient(to_top_left,transparent_40%,--theme(--color-red-500/5%))] after:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)]',
    },
  },
  defaultVariants: {
    issueSeverity: 'none',
  },
});

const primaryStyles = tv({
  base: 'm-[2px] overflow-hidden rounded-[calc(1rem-2px)] border border-white bg-linear-to-b from-gray-50 to-gray-50/80 shadow-xs transition',
  variants: {
    isInteractive: {
      true: '',
      false: '',
    },
  },
});

const primaryLinkStyles = tv({
  extend: primaryStyles,
  base: 'absolute inset-0 z-0 block no-underline',
  variants: {
    isInteractive: {
      true: 'hover:from-white hover:to-white/80 hover:no-underline hover:shadow-md hover:shadow-zinc-800/3 pressed:from-gray-50 pressed:to-gray-50/90 pressed:shadow-xs',
      false: '',
    },
  },
});

export function OverviewCard({
  cells,
  className,
  detailsTitle,
  detailsContent,
  primaryHref,
  ...props
}: {
  cells: ReactNode;
  className?: string;
  detailsTitle?: string;
  detailsContent?: ReactNode;
  primaryHref?: string;
} & ComponentPropsWithoutRef<'div'>) {
  return (
    <div className="mb-4 px-2 pt-1">
      <div {...props} className={className}>
        <div className="relative">
          <div className="px-1 py-2">
            {primaryHref ? (
              <Link
                href={primaryHref}
                variant="secondary"
                className={primaryLinkStyles({ isInteractive: true })}
              >
                <span className="sr-only">Open details</span>
              </Link>
            ) : null}
            {cells}
          </div>
        </div>
        {detailsContent && detailsTitle ? (
          <OverviewCardDetails title={detailsTitle}>
            {detailsContent}
          </OverviewCardDetails>
        ) : null}
      </div>
    </div>
  );
}

function OverviewCardDetails({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="relative z-20 mt-1.5 flex flex-col gap-1 rounded-md rounded-t-sm px-3 pt-1 pb-3">
      <div className="flex items-center gap-2 pl-8.5 text-xs leading-6 font-semibold text-gray-500/70 uppercase">
        {title}
      </div>
      {children}
    </div>
  );
}
