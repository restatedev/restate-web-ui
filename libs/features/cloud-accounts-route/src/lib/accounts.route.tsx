import { ClientActionFunctionArgs, Outlet, redirect } from '@remix-run/react';
import { createAccount } from '@restate/data-access/cloud/api-client';
import { AccountSelector } from './AccountSelector';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { listAccountsWithCache } from './apis';
import { clientLoader } from './loader';
import { useEnvironmentParam } from '@restate/features/cloud/utils-routes';

// TODO: Error handling, Pending UI
const clientAction = async ({ request, params }: ClientActionFunctionArgs) => {
  listAccountsWithCache.invalidate();
  const { data } = await createAccount({});
  return redirect(`/accounts/${data?.accountId}/environments`);
};

function Component() {
  const environmentId = useEnvironmentParam();
  return (
    <>
      {!environmentId && (
        <LayoutOutlet zone={LayoutZone.AppBar}>
          <AccountSelector />
        </LayoutOutlet>
      )}
      <Outlet />
    </>
  );
}

export const accounts = { clientAction, clientLoader, Component };
