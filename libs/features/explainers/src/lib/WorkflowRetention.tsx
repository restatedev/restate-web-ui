import { InlineTooltip } from '@restate/ui/tooltip';
import { ComponentProps, PropsWithChildren } from 'react';

export function WorkflowRetentionExplainer({
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
      title="Workflow retention"
      description={
        <p>
          The period for which a workflow's result is retained after{' '}
          <span className="font-mono font-medium italic">run()</span> completes.
        </p>
      }
      className={className}
      learnMoreHref="https://docs.restate.dev/operate/configuration/services/"
    >
      {children}
    </InlineTooltip>
  );
}
