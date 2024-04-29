import {
  redirect,
  ClientActionFunctionArgs,
  Outlet,
  useRouteLoaderData,
} from '@remix-run/react';
import { createEnvironment } from '@restate/data-access/cloud/api-client';
import invariant from 'tiny-invariant';
import { EnvironmentSelector } from './EnvironmentSelector';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { clientLoader } from './loader';
import {
  AccountSelector,
  accounts,
} from '@restate/features/cloud/accounts-route';
import { useEnvironmentParam } from '@restate/features/cloud/utils-routes';
import { listEnvironmentsWithCache } from './apis';

// TODO: Error handling, Pending UI
const clientAction = async ({ request, params }: ClientActionFunctionArgs) => {
  const { accountId } = params;
  invariant(accountId, 'Missing accountId param');
  listEnvironmentsWithCache.invalidate({ accountId });
  console.log('action');

  const { data } = await createEnvironment({ accountId });
  return redirect(
    `/accounts/${params.accountId}/environments/${data?.environmentId}`
  );
};

function Component() {
  const accountsData =
    useRouteLoaderData<typeof accounts.clientLoader>('routes/accounts');
  const environmentId = useEnvironmentParam();

  if (!environmentId) {
    return null;
  }

  return (
    <>
      <LayoutOutlet zone={LayoutZone.AppBar}>
        <div className="grid items-center auto-cols-auto grid-rows-1 ">
          {accountsData?.accounts && (
            <div className="col-start-1 col-end-2 row-start-1 z-10">
              <AccountSelector accounts={accountsData.accounts} />
            </div>
          )}
          <div className="col-start-1 col-end-3 row-start-1">
            <EnvironmentSelector />
          </div>
        </div>
      </LayoutOutlet>
      <Outlet />
    </>
  );
}

export const environments = { clientAction, clientLoader, Component };
