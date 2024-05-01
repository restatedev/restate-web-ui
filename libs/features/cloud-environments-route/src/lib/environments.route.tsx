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
import { CreateEnvironmentOnboarding } from './CreateEnvironmentOnboarding';

function Component() {
  const accountsResponse =
    useRouteLoaderData<typeof accounts.clientLoader>('routes/accounts');
  const environmentId = useEnvironmentParam();

  if (!environmentId) {
    return (
      <>
        <LayoutOutlet zone={LayoutZone.AppBar}>
          <div className="flex items-center gap-2">
            {accountsResponse?.accountsList?.data?.accounts && (
              <AccountSelector
                accounts={accountsResponse?.accountsList?.data?.accounts}
              />
            )}
          </div>
        </LayoutOutlet>
        <CreateEnvironmentOnboarding />
      </>
    );
  }

  return (
    <>
      <LayoutOutlet zone={LayoutZone.AppBar}>
        <div className="flex items-center gap-2">
          {accountsResponse?.accountsList?.data?.accounts && (
            <AccountSelector
              accounts={accountsResponse?.accountsList?.data?.accounts}
            />
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
