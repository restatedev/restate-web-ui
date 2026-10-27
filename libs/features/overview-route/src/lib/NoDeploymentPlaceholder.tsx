import { useRestateContext } from '@restate/features-restate-context';
import { useIsReadOnly } from '@restate/data-access-admin-api';
import {
  ServiceDeploymentExplainer,
  ServiceExplainer,
} from '@restate/features-explainers';
import {
  REGISTER_DEPLOYMENT_QUERY,
  TriggerRegisterDeploymentDialog,
} from '@restate/features-register-deployment';
import { Spinner } from '@restate/ui-loading';
import { ErrorPopoverPill } from './ErrorPopoverPill';
import { OVERVIEW_MODE_PARAM } from './overviewMode';

export function NoDeploymentPlaceholder({
  error,
  isRefreshing,
}: {
  error?: Error | null;
  isRefreshing?: boolean;
}) {
  const { OnboardingGuide } = useRestateContext();
  const isReadOnly = useIsReadOnly();

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
        Point Restate to your deployed services so Restate can register your{' '}
        <ServiceExplainer>services</ServiceExplainer> and handlers
      </p>
      <div className="mt-4 flex gap-2">
        {isReadOnly ? (
          <TriggerRegisterDeploymentDialog
            href={`?${OVERVIEW_MODE_PARAM}=deployments&${REGISTER_DEPLOYMENT_QUERY}=true`}
          />
        ) : (
          <>
            <TriggerRegisterDeploymentDialog />
            {OnboardingGuide && (
              <OnboardingGuide stage="register-deployment-trigger" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
