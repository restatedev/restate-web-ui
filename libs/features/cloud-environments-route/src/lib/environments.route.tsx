import { Outlet, useRouteLoaderData } from '@remix-run/react';
import { EnvironmentSelector } from './EnvironmentSelector';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { clientLoader } from './loader';
import {
  AccountSelector,
  accounts,
} from '@restate/features/cloud/accounts-route';
import {
  toEnvironmentRoute,
  useAccountParam,
  useEnvironmentParam,
} from '@restate/features/cloud/routes-utils';
import { clientAction } from './action';
import { CreateEnvironmentOnboarding } from './CreateEnvironmentOnboarding';
import { Nav, NavItem } from '@restate/ui/nav';
import { EnvironmentPending } from './EnvironmentPending';
import { Icon, IconName } from '@restate/ui/icons';

function Component() {
  const accountsResponse =
    useRouteLoaderData<typeof accounts.clientLoader>('routes/accounts');
  const environmentId = useEnvironmentParam();
  const accountId = useAccountParam();

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
      <EnvironmentPending />
      <LayoutOutlet zone={LayoutZone.AppBar}>
        <div className="flex items-center gap-2 flex-1">
          {accountsResponse?.accountsList?.data?.accounts && (
            <AccountSelector
              accounts={accountsResponse?.accountsList?.data?.accounts}
            />
          )}
          <EnvironmentSelector />
          <LayoutOutlet zone={LayoutZone.Nav}>
            <Nav ariaCurrentValue="page">
              <NavItem
                href={`${toEnvironmentRoute(
                  accountId!,
                  environmentId
                )}/settings`}
              >
                Settings
              </NavItem>
              <NavItem
                href={`${toEnvironmentRoute(accountId!, environmentId)}/logs`}
              >
                Logs
              </NavItem>
            </Nav>
          </LayoutOutlet>
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
