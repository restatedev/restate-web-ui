import type { ComponentPropsWithoutRef, ReactNode } from 'react';

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
