import { useRestateContext } from '@restate/features-restate-context';
import {
  ServiceDeploymentExplainer,
  ServiceExplainer,
} from '@restate/features-explainers';
import { TriggerRegisterDeploymentDialog } from '@restate/features-register-deployment';
import { IconName } from '@restate/ui-icons';
import { Spinner } from '@restate/ui-loading';
import { ErrorPopoverPill } from './ErrorPopoverPill';

export function NoDeploymentPlaceholder({
  error,
  isRefreshing,
}: {
  error?: Error | null;
  isRefreshing?: boolean;
}) {
  const { OnboardingGuide, tunnel } = useRestateContext();

  return (
    <div className="relative mt-6 flex w-full flex-col items-center gap-2 text-center">
      <div className="flex min-h-5 items-center justify-center">
        {isRefreshing ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Spinner />
            Refreshing…
          </p>
        ) : error ? (
          <ErrorPopoverPill error={error} label="Could not load deployments" />
        ) : (
          <h3 className="text-sm font-semibold text-tertiary">
            No{' '}
            <ServiceDeploymentExplainer>
              service deployments
            </ServiceDeploymentExplainer>
          </h3>
        )}
      </div>
      <p className="max-w-md px-4 text-sm text-muted">
        {tunnel?.isEnabled ? (
          <>
            Connect a service with the SDK, or register a deployed endpoint, so
            Restate can discover your{' '}
            <ServiceExplainer>services</ServiceExplainer> and handlers
          </>
        ) : (
          <>
            Point Restate to your deployed services so Restate can register your{' '}
            <ServiceExplainer>services</ServiceExplainer> and handlers
          </>
        )}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {tunnel?.isEnabled && (
          <TriggerRegisterDeploymentDialog
            endpoint="connect://"
            icon={IconName.Connect}
          >
            Connect your service
          </TriggerRegisterDeploymentDialog>
        )}
        <TriggerRegisterDeploymentDialog />
        {OnboardingGuide && (
          <OnboardingGuide stage="register-deployment-trigger" />
        )}
      </div>
    </div>
  );
}
