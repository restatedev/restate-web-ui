import { useRestateContext } from '@restate/features/restate-context';
import {
  ServiceDeploymentExplainer,
  ServiceExplainer,
} from '@restate/features/explainers';
import { TriggerRegisterDeploymentDialog } from '@restate/features/register-deployment';
import { ErrorBanner } from '@restate/ui/error';

export function NoDeploymentPlaceholder({ error }: { error?: Error | null }) {
  const { OnboardingGuide } = useRestateContext();

  if (error) {
    return (
      <div className="relative mt-6 flex w-full flex-col items-center gap-2">
        <ErrorBanner error={error} />
      </div>
    );
  }

  return (
    <div className="relative mt-6 flex w-full flex-col items-center gap-2 text-center">
      <h3 className="text-sm font-semibold text-gray-600">
        No{' '}
        <ServiceDeploymentExplainer>
          service deployments
        </ServiceDeploymentExplainer>
      </h3>
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
