import { InlineTooltip } from '@restate/ui/tooltip';
import { ComponentProps, PropsWithChildren } from 'react';

export const JOURNAL_RETENTION_DESCRIPTION =
  "The period for which an invocation's journal entries are retained.";

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
      title="Journal retention"
      description={<p>{JOURNAL_RETENTION_DESCRIPTION}</p>}
      className={className}
      learnMoreHref="https://docs.restate.dev/services/configuration#retention-of-completed-invocations"
    >
      {children}
    </InlineTooltip>
  );
}
