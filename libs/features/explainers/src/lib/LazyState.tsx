import { InlineTooltip } from '@restate/ui/tooltip';
import { ComponentProps, PropsWithChildren } from 'react';

export function LazyStateExplainer({
  children,
  variant,
  className,
}: PropsWithChildren<{
  variant?: ComponentProps<typeof InlineTooltip>['variant'];
  className?: string;
}>) {
  return (
    <InlineTooltip
      variant={variant}
      title="Lazy state"
      description={
        <p>
          Controls whether state is loaded lazily on demand or eagerly upfront.
        </p>
      }
      className={className}
    >
      {children}
    </InlineTooltip>
  );
}
