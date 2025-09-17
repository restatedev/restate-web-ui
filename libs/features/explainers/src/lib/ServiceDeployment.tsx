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
          Restate services are deployed as (Service) deployments. A service runs
          in your infrastructure as containers, serverless functions, VMs, or
          Kubernetes pods.
        </p>
      }
      learnMoreHref="https://docs.restate.dev/deploy/overview#restate-services"
    >
      {children}
    </InlineTooltip>
  );
}
