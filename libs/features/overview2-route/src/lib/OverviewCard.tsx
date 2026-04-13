import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { tv } from '@restate/util/styles';
import { focusRing } from '@restate/ui/focus';

export const cellsContainerStyles = tv({
  extend: focusRing,
  base: '@container cursor-default overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs ring-1 ring-white transition ring-inset',
  variants: {
    issueSeverity: {
      none: '',
      low: 'before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:-left-6 before:animate-stripeScroll before:bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,--theme(--color-orange-500/6%)_8px,--theme(--color-orange-500/6%)_16px)] before:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)] after:pointer-events-none after:absolute after:inset-0 after:rounded-2xl after:bg-[linear-gradient(to_top_left,transparent_40%,--theme(--color-orange-500/5%))] after:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)]',
      high: 'before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:-left-6 before:animate-stripeScroll before:bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,--theme(--color-red-500/6%)_8px,--theme(--color-red-500/6%)_16px)] before:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)] after:pointer-events-none after:absolute after:inset-0 after:rounded-2xl after:bg-[linear-gradient(to_top_left,transparent_40%,--theme(--color-red-500/5%))] after:[mask-image:linear-gradient(to_top_left,transparent_calc(100%-3rem),black_100%)]',
    },
  },
  defaultVariants: {
    issueSeverity: 'none',
  },
});

export function OverviewCard({
  cells,
  className,
  detailsTitle,
  detailsContent,
  ...props
}: {
  cells: ReactNode;
  className?: string;
  detailsTitle?: string;
  detailsContent?: ReactNode;
} & ComponentPropsWithoutRef<'div'>) {
  return (
    <div className="mb-4 px-2 pt-1">
      <div {...props} className={className}>
        <div className="px-1 py-2.5">{cells}</div>
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
    <div className="flex flex-col gap-1 border-gray-200/90 bg-black/2 pt-3 pb-2.5">
      <div className="-mt-5 flex items-center text-2xs font-semibold tracking-wide uppercase">
        <div className="grow-0 basis-9.5 border-t border-gray-200/90" />
        <div className="px-2 text-black/30">{title}</div>
        <div className="flex-auto border-t border-gray-200/90" />
      </div>
      {children}
    </div>
  );
}
