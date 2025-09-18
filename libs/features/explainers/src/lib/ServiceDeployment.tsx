import { InlineTooltip } from '@restate/ui/tooltip';
import { PropsWithChildren } from 'react';

export function ServiceDeploymentExplainer({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <InlineTooltip
      className={className}
      title="Service Deployment"
      description={
        <p>
          A (service) deployment in Restate is a specific, versioned instance of
          your service code — whether running as an HTTP endpoint, a Lambda
          function, or another supported environment. Each deployment is
          immutable: once registered, its code and endpoint must not change.
        </p>
      }
      learnMoreHref="https://docs.restate.dev/services/versioning#what-is-a-deployment%3F"
    >
      {children}
    </InlineTooltip>
  );
}
