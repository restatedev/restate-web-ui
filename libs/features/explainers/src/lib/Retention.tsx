import { InlineTooltip } from '@restate/ui/tooltip';
import { ComponentProps, PropsWithChildren } from 'react';

export function RetentionExplainer({
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
      title="Retention"
      description={
        <p>
          The duration an invocation is retained after completion. You can
          configure the retention period at the service level through the SDK.
        </p>
      }
      className={className}
      learnMoreHref="https://docs.restate.dev/operate/configuration/services/"
    >
      {children}
    </InlineTooltip>
  );
}
