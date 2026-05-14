import { useRestateContext } from '@restate/features/restate-context';
import {
  ServiceDeploymentExplainer,
  ServiceExplainer,
} from '@restate/features/explainers';
import { TriggerRegisterDeploymentDialog } from '@restate/features/register-deployment';
import { ErrorBanner } from '@restate/ui/error';
import { Spinner } from '@restate/ui/loading';
import { Icon, IconName } from '@restate/ui/icons';
import { Button } from '@restate/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';

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
          <Popover>
            <PopoverTrigger>
              <Button
                variant="secondary"
                className="flex shrink-0 items-center gap-1.5 rounded-xl border-red-200/80 bg-red-50/80 px-3 py-1 text-xs text-red-600 shadow-none hover:bg-red-100/80"
              >
                <Icon
                  name={IconName.TriangleAlert}
                  className="h-3.5 w-3.5 fill-red-200 text-red-500"
                />
                Could not load deployments
                <Icon
                  name={IconName.ChevronsUpDown}
                  className="h-3.5 w-3.5 text-red-400"
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="max-w-sm">
              <ErrorBanner error={error} className="rounded-xl" />
            </PopoverContent>
          </Popover>
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
