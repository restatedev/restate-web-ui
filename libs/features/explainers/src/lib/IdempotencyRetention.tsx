import { InlineTooltip } from '@restate/ui/tooltip';
import { ComponentProps, PropsWithChildren } from 'react';

export function idempotencyRetentionDescription(isWorkflow?: boolean) {
  return isWorkflow
    ? "The period for which a shared handler's result is retained when invoked with an idempotency key."
    : "The period for which an invocation's result is retained when invoked with an idempotency key.";
}

export function IdempotencyRetentionExplainer({
  children,
  variant,
  className,
  isWorkflow,
}: PropsWithChildren<{
  variant?: ComponentProps<typeof InlineTooltip>['variant'];
  className?: string;
  isWorkflow?: boolean;
}>) {
  return (
    <InlineTooltip
      variant={variant}
      title="Idempotency retention"
      description={<p>{idempotencyRetentionDescription(isWorkflow)}</p>}
      className={className}
      learnMoreHref="https://docs.restate.dev/services/configuration#retention-of-completed-invocations"
    >
      {children}
    </InlineTooltip>
  );
}
