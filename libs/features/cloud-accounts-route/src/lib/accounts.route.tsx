import { Outlet, useLoaderData } from '@remix-run/react';
import { AccountSelector } from './AccountSelector';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { clientLoader } from './loader';
import { useEnvironmentParam } from '@restate/features/cloud/utils-routes';
import { clientAction } from './action';

function Component() {
  const environmentId = useEnvironmentParam();
  const { accounts } = useLoaderData<typeof clientLoader>();

  if (environmentId) {
    return <Outlet />;
  }

  return (
    <>
      {!environmentId && (
        <LayoutOutlet zone={LayoutZone.AppBar}>
          <div className="shadow-sm rounded-xl">
            <AccountSelector accounts={accounts} />
          </div>
        </LayoutOutlet>
      )}
      <Outlet />
    </>
  );
}

export const accounts = { clientAction, clientLoader, Component };
