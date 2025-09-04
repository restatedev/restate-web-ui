import { InlineTooltip } from '@restate/ui/tooltip';
import { ComponentProps, PropsWithChildren } from 'react';

export function JournalRetentionExplainer({
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
      title="Service access"
      description={
        <p>
          The period for which an invocation's journal entries are retained.
        </p>
      }
      className={className}
      learnMoreHref="https://docs.restate.dev/operate/configuration/services/"
    >
      {children}
    </InlineTooltip>
  );
}
