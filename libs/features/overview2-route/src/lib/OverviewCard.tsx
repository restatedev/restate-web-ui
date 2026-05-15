import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { tv } from '@restate/util/styles';
import { focusRing } from '@restate/ui/focus';
import { Link } from '@restate/ui/link';

export const cellsContainerStyles = tv({
  extend: focusRing,
  base: '@container relative isolate cursor-default overflow-hidden rounded-2xl border border-white/80 bg-gray-200/50 shadow-[inset_0_-0.5px_0px_1px_rgba(0,0,0,0.05)] transition',
});

const primaryStyles = tv({
  base: 'relative m-1.5 overflow-hidden rounded-[calc(1rem-2px)] border border-white bg-linear-to-b from-white/90 to-gray-50/80 px-2 pt-2 pb-3 shadow-xs transition hover:to-white/80 hover:shadow-md hover:shadow-zinc-800/3',
  variants: {
    issueSeverity: {
      none: '',
      low: 'before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:-left-6 before:z-10 before:animate-stripeScroll before:bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,--theme(--color-orange-500/6%)_8px,--theme(--color-orange-500/6%)_16px)] before:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)] after:pointer-events-none after:absolute after:inset-0 after:z-10 after:bg-[linear-gradient(to_top_left,transparent_40%,--theme(--color-orange-500/10%))] after:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)]',
      high: 'before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:-left-6 before:z-10 before:animate-stripeScroll before:bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,--theme(--color-red-500/6%)_8px,--theme(--color-red-500/6%)_16px)] before:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)] after:pointer-events-none after:absolute after:inset-0 after:z-10 after:bg-[linear-gradient(to_top_left,transparent_40%,--theme(--color-red-500/10%))] after:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)]',
    },
  },
  defaultVariants: {
    issueSeverity: 'none',
  },
});

const primaryLinkStyles = tv({
  base: 'peer absolute inset-0 z-[1] block border-transparent no-underline shadow-none hover:bg-transparent pressed:bg-transparent',
});

export function OverviewCard({
  cells,
  className,
  detailsTitle,
  detailsContent,
  primaryHref,
  issueSeverity,
  ...props
}: {
  cells: ReactNode;
  className?: string;
  detailsTitle?: string;
  detailsContent?: ReactNode;
  primaryHref?: string;
  issueSeverity?: 'none' | 'low' | 'high';
} & ComponentPropsWithoutRef<'div'>) {
  return (
    <div className="mb-4 px-2 pt-1">
      <div {...props} className={className}>
        <div className="relative">
          <div className={primaryStyles({ issueSeverity })}>
            {primaryHref ? (
              <>
                <Link
                  href={primaryHref}
                  variant="secondary"
                  className={primaryLinkStyles()}
                >
                  <span className="sr-only">Open details</span>
                </Link>
                <div className="absolute inset-0 rounded-[calc(1rem-2px)] peer-pressed:bg-black/2" />
              </>
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
    <div className="relative z-2 mt-1.5 flex flex-col gap-0 rounded-md rounded-t-sm px-5.5 pt-0 pb-3">
      <div className="flex items-center gap-2 py-0.5 pl-8.5 text-xs leading-6 font-semibold text-gray-500/70 uppercase">
        {title}
      </div>
      {children}
    </div>
  );
}
