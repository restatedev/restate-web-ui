import { useRouteLoaderData, Await } from '@remix-run/react';
import { environments } from '@restate/features/cloud/environments-route';
import { useEnvironmentParam } from '@restate/features/cloud/routes-utils';
import { Button } from '@restate/ui/button';
import { ErrorBanner } from '@restate/ui/error';
import { Icon, IconName } from '@restate/ui/icons';
import { Suspense } from 'react';
import invariant from 'tiny-invariant';
import { ApiKeys } from './ApiKeys';
import { CLI } from './Cli';
import { Http } from './Http';
import { Security } from './Security';

export function ErrorFetchingEnvironmentDetails({
  isLoading,
  retry,
}: {
  isLoading: boolean;
  retry: VoidFunction;
}) {
  const environmentId = useEnvironmentParam();

  invariant(environmentId, 'Missing environmentId param');
  const environmentsResponse = useRouteLoaderData<
    typeof environments.clientLoader
  >('routes/accounts.$accountId.environments');
  const environmentDetailsPromise = environmentsResponse?.[environmentId];

  if (isLoading) {
    return null;
  }

  return (
    <Suspense>
      <Await resolve={environmentDetailsPromise}>
        {(environmentDetails) => {
          if (environmentDetails?.error) {
            return (
              <div className="sticky top-24 z-30 -mt-12">
                <ErrorBanner
                  errors={[
                    new Error(
                      'Failed to load the environment. Please try again.'
                    ),
                  ]}
                  className="backdrop-blur-xl backdrop-saturate-200 bg-red-200/60 shadow-lg shadow-zinc-800/5 border border-red-200"
                >
                  <Button
                    variant="secondary"
                    className="flex items-center gap-2 px-3 py-1"
                    onClick={retry}
                  >
                    <Icon name={IconName.Retry} className="w-[1.125em]" /> Retry
                  </Button>
                </ErrorBanner>
              </div>
            );
          } else {
            return null;
          }
        }}
      </Await>
    </Suspense>
  );
}
