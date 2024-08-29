import { useMatches } from '@remix-run/react';
import { Spinner } from '@restate/ui/button';
import invariant from 'tiny-invariant';
import { Suspense, useDeferredValue, useEffect } from 'react';
import {
  useAccountParam,
  useEnvironmentParam,
} from '@restate/features/cloud/routes-utils';
import { HideNotification, LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { useEnvironmentDetails } from './useEnvironmentDetails';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface EnvironmentPendingProps {}

export function EnvironmentPending(props: EnvironmentPendingProps) {
  const currentAccountId = useAccountParam();
  const currentEnvironmentParam = useEnvironmentParam();
  invariant(currentAccountId, 'Account id is missing');

  if (!currentEnvironmentParam) {
    return null;
  }

  return (
    <Suspense>
      <EnvironmentPendingContent />
      <Title />
    </Suspense>
  );
}

function Title() {
  const environmentDetails = useEnvironmentDetails();
  const matches = useMatches();
  const name = environmentDetails?.data?.name;
  const isInSettingsPage = matches.some(
    ({ id }) =>
      id === 'routes/accounts.$accountId.environments.$environmentId.settings'
  );
  const isInLogsPage = matches.some(
    ({ id }) =>
      id === 'routes/accounts.$accountId.environments.$environmentId.logs'
  );

  const title = [
    isInSettingsPage ? 'Settings' : isInLogsPage ? 'Logs' : '',
    name,
    'Restate Cloud',
  ]
    .filter(Boolean)
    .join(' - ');

  useEffect(() => {
    document.title = title;
  }, [title]);

  return null;
}

function EnvironmentPendingContent() {
  const environmentDetails = useEnvironmentDetails({
    refetchInterval: (query) =>
      query.state.data?.status === 'PENDING' ? 3000 : false,
  });
  const isPending = environmentDetails?.data?.status === 'PENDING';
  const deferredIsPending = useDeferredValue(isPending);

  if (deferredIsPending) {
    return (
      <LayoutOutlet zone={LayoutZone.Notification}>
        <div className="flex items-center gap-2 bg-orange-100 rounded-xl bg-orange-200/60 shadow-lg shadow-zinc-800/5 border border-orange-200 text-orange-800 px-3 text-sm">
          <Spinner /> Your Restate environment is being created and will be
          ready shortly.
        </div>
        {!isPending && <HideNotification />}
      </LayoutOutlet>
    );
  }

  return null;
}
