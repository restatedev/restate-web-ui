import { Outlet, useLoaderData } from '@remix-run/react';
import { clientLoader } from './loader';
import { clientAction } from './action';
import { CreateAccountOnboarding } from './CreateAccountOnboarding';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';

function Component() {
  const loaderData = useLoaderData<typeof clientLoader>();

  if (loaderData?.accountsList?.error) {
    return <p>failed</p>;
  }
  const accounts = loaderData?.accountsList?.data?.accounts ?? [];
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

export const accounts = { clientAction, clientLoader, Component };
