import {
  Await,
  useAsyncValue,
  useLoaderData,
  useRevalidator,
} from '@remix-run/react';
import { Spinner } from '@restate/ui/button';
import invariant from 'tiny-invariant';
import { clientLoader } from './loader';
import { Suspense, useDeferredValue, useEffect } from 'react';
import {
  useAccountParam,
  useEnvironmentParam,
} from '@restate/features/cloud/routes-utils';
import { describeEnvironment } from '@restate/data-access/cloud/api-client';
import { HideNotification, LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { describeEnvironmentWithCache } from './apis';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface EnvironmentPendingProps {}

export function EnvironmentPending(props: EnvironmentPendingProps) {
  const currentAccountId = useAccountParam();
  const { environmentList, ...environmentsWithDetailsPromises } =
    useLoaderData<typeof clientLoader>();
  const currentEnvironmentParam = useEnvironmentParam();
  invariant(currentAccountId, 'Account id is missing');

  if (!currentEnvironmentParam) {
    return null;
  }

  return (
    <Suspense>
      <Await resolve={environmentsWithDetailsPromises[currentEnvironmentParam]}>
        <EnvironmentPendingContent />
      </Await>
    </Suspense>
  );
}

function EnvironmentPendingContent() {
  const environmentDetails = useAsyncValue() as Awaited<
    ReturnType<typeof describeEnvironment>
  >;
  const environmentId = useEnvironmentParam();
  const accountId = useAccountParam();
  const isPending = environmentDetails.data?.status === 'PENDING';
  const deferredIsPending = useDeferredValue(isPending);

  const { revalidate } = useRevalidator();
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    if (isPending && accountId && environmentId) {
      id = setInterval(() => {
        describeEnvironmentWithCache.invalidate({ accountId, environmentId });
        revalidate();
      }, 3000);
    }

    return () => {
      id && clearInterval(id);
    };
  }, [isPending, revalidate, accountId, environmentId]);

  if (deferredIsPending) {
    return (
      <LayoutOutlet zone={LayoutZone.Notification}>
        <div className="flex items-center gap-2 bg-orange-100 rounded-xl bg-orange-200/60 shadow-lg shadow-zinc-800/5 border border-orange-200 text-orange-800 px-3 text-sm">
          <Spinner /> Your restate environment is being created and will be
          ready shortly.
        </div>
        {!isPending && <HideNotification />}
      </LayoutOutlet>
    );
  }

  return null;
}
