import { useRouteLoaderData, Await } from '@remix-run/react';
import {
  environments,
  useEnvironmentDetails,
} from '@restate/features/cloud/environments-route';
import { useEnvironmentParam } from '@restate/features/cloud/routes-utils';
import { Button } from '@restate/ui/button';
import { ErrorBanner } from '@restate/ui/error';
import { Icon, IconName } from '@restate/ui/icons';
import { HideNotification, LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { useState } from 'react';
import invariant from 'tiny-invariant';

export function ErrorFetchingEnvironmentDetails({
  isLoading,
  retry,
}: {
  isLoading: boolean;
  retry: VoidFunction;
}) {
  const environmentId = useEnvironmentParam();

  invariant(environmentId, 'Missing environmentId param');
  const environmentDetails = useEnvironmentDetails();
  const [willStartLoading, setWillStartLoading] = useState(false);

  if (isLoading || environmentDetails.isLoading) {
    return null;
  }
  if (environmentDetails.error) {
    return (
      <LayoutOutlet zone={LayoutZone.Notification}>
        <ErrorBanner
          errors={[
            new Error('Failed to load the environment. Please try again.'),
          ]}
          className="flex [&>*]:flex-auto backdrop-blur-xl backdrop-saturate-200 bg-red-200/60 border border-red-200 py-0"
        >
          <Button
            variant="secondary"
            className="flex items-center gap-2 px-3 py-0.5 text-sm"
            onClick={() => {
              setWillStartLoading(true);
              setTimeout(() => {
                retry();
                setWillStartLoading(false);
              }, 100);
            }}
          >
            <Icon name={IconName.Retry} className="w-[1em]" /> Retry
          </Button>
        </ErrorBanner>
        {willStartLoading && <HideNotification />}
      </LayoutOutlet>
    );
  }

  return null;
}
