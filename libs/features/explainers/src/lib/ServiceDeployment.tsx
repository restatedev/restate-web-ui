import { InlineTooltip } from '@restate/ui/tooltip';
import { PropsWithChildren } from 'react';

export function ServiceDeploymentExplainer({
  children,
}: PropsWithChildren<unknown>) {
  return (
    <InlineTooltip
      title="Service Deployment"
      description={
        <p>
          Restate services are deployed as Service deployments. A service
          deployment can be a Lambda function, a Kubernetes pod, a Knative
          Service, or any other process reachable at a specific URL.
        </p>
      }
      learnMoreHref="https://docs.restate.dev/deploy/overview#restate-services"
    >
      {children}
    </InlineTooltip>
  );
}
