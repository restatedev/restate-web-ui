import { Outlet } from '@remix-run/react';
import { clientLoader, shouldRevalidate } from './loader';
import { clientAction } from './action';
import { CreateAccountOnboarding } from './CreateAccountOnboarding';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { useListAccounts } from './useListAccounts';

function Component() {
  const { data: accountsList, error } = useListAccounts();
  if (error) {
    return null;
  }
  const accounts = accountsList?.accounts ?? [];
  if (accounts.length === 0) {
    return (
      <>
        <LayoutOutlet zone={LayoutZone.AppBar} variant="hidden" />
        <CreateAccountOnboarding />
      </>
    );
  }

  return <Outlet />;
}

export const accounts = {
  clientAction,
  clientLoader,
  Component,
  shouldRevalidate,
};
