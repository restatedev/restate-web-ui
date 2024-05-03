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
import { Button } from '@restate/ui/button';

function Component() {
  const accountsResponse =
    useRouteLoaderData<typeof accounts.clientLoader>('routes/accounts');
  const environmentId = useEnvironmentParam();

  if (!environmentId) {
    return (
      <>
        <LayoutOutlet zone={LayoutZone.AppBar} variant="secondary">
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
        <div className="flex items-center gap-2 flex-1">
          {accountsResponse?.accountsList?.data?.accounts && (
            <AccountSelector
              accounts={accountsResponse?.accountsList?.data?.accounts}
            />
          )}
          <EnvironmentSelector />
          <div className="ml-auto pr-4 flex gap-2 items-center">
            <Button variant="secondary" className="py-1.5 px-2.5">
              Settings
            </Button>
            <Button
              variant="secondary"
              className="bg-transparent border-none shadow-none py-1.5 px-2.5"
            >
              Logs
            </Button>
          </div>
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
