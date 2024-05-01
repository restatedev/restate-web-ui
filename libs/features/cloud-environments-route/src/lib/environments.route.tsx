import { Outlet, useRouteLoaderData } from '@remix-run/react';

import { EnvironmentSelector } from './EnvironmentSelector';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { clientLoader } from './loader';
import {
  AccountSelector,
  accounts,
} from '@restate/features/cloud/accounts-route';
import { useEnvironmentParam } from '@restate/features/cloud/utils-routes';
import { clientAction } from './action';

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
        <div className="flex items-center gap-2">
          {accountsData?.accounts && (
            <AccountSelector accounts={accountsData.accounts} />
          )}
          <EnvironmentSelector />
        </div>
      </LayoutOutlet>
      <Outlet />
    </>
  );
}

export const environments = {
  clientAction,
  clientLoader,
  Component,
};
