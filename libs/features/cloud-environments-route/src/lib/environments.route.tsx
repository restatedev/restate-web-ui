import { Outlet, PrefetchPageLinks } from '@remix-run/react';
import { EnvironmentSelector } from './EnvironmentSelector';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { clientLoader, shouldRevalidate } from './loader';
import {
  AccountSelector,
  useListAccounts,
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
import { Support } from '@restate/features/cloud/support';
import { FeatureFlag } from '@restate/util/feature-flag';

function Component() {
  const { data: accountsList } = useListAccounts();
  const environmentId = useEnvironmentParam();
  const accountId = useAccountParam();

  if (!environmentId) {
    return (
      <>
        <LayoutOutlet zone={LayoutZone.AppBar} variant="secondary">
          <div className="flex items-center gap-2">
            {accountsList?.accounts && (
              <AccountSelector accounts={accountsList?.accounts} />
            )}
          </div>
        </LayoutOutlet>
        <CreateEnvironmentOnboarding />
      </>
    );
  }

  return (
    <>
      <PrefetchPageLinks
        page={`${toEnvironmentRoute(accountId!, environmentId)}/settings`}
      />
      <PrefetchPageLinks
        page={`${toEnvironmentRoute(accountId!, environmentId)}/logs`}
      />
      <EnvironmentPending />
      <Support />
      <LayoutOutlet zone={LayoutZone.AppBar}>
        <div className="flex items-center gap-2 flex-1">
          {accountsList?.accounts && (
            <AccountSelector accounts={accountsList?.accounts} />
          )}
          <EnvironmentSelector />
          <LayoutOutlet zone={LayoutZone.Nav}>
            <Nav ariaCurrentValue="page">
              <FeatureFlag featureFlag="FEATURE_OVERVIEW_PAGE">
                <NavItem
                  href={`${toEnvironmentRoute(
                    accountId!,
                    environmentId
                  )}/overview`}
                >
                  Overview
                </NavItem>
              </FeatureFlag>
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
  shouldRevalidate,
};
