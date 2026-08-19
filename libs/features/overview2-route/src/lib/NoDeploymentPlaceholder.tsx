import { useRestateContext } from '@restate/features/restate-context';
import {
  ServiceDeploymentExplainer,
  ServiceExplainer,
} from '@restate/features/explainers';
import { TriggerRegisterDeploymentDialog } from '@restate/features/register-deployment';
import { Spinner } from '@restate/ui/loading';
import { ErrorPopoverPill } from './ErrorPopoverPill';

export function NoDeploymentPlaceholder({
  error,
  isRefreshing,
}: {
  error?: Error | null;
  isRefreshing?: boolean;
}) {
  const { OnboardingGuide } = useRestateContext();

  return (
    <div className="relative mt-6 flex w-full flex-col items-center gap-2 text-center">
      <div className="flex min-h-5 items-center justify-center">
        {isRefreshing ? (
          <p className="flex items-center gap-2 text-sm text-gray-500">
            <Spinner />
            Refreshing…
          </p>
        ) : error ? (
          <ErrorPopoverPill error={error} label="Could not load deployments" />
        ) : (
          <h3 className="text-sm font-semibold text-gray-600">
            No{' '}
            <ServiceDeploymentExplainer>
              service deployments
            </ServiceDeploymentExplainer>
          </h3>
        )}
      </div>
      <p className="max-w-md px-4 text-sm text-gray-500">
        Point Restate to your deployed services so Restate can register your{' '}
        <ServiceExplainer>services</ServiceExplainer> and handlers
      </p>
      <div className="mt-4 flex gap-2">
        <TriggerRegisterDeploymentDialog />
        {OnboardingGuide && (
          <OnboardingGuide stage="register-deployment-trigger" />
        )}
      </div>
    </div>
  );
}
