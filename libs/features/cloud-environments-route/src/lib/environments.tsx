import { redirect, ClientActionFunctionArgs, Outlet } from '@remix-run/react';
import {
  listEnvironments,
  createEnvironment,
} from '@restate/data-access/cloud/api-client';
import invariant from 'tiny-invariant';
import { EnvironmentSelector } from './EnvironmentSelector';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { withCache } from '@restate/util/cache';
import { clientLoader } from './loader';

const listEnvironmentsWithCache = withCache(listEnvironments);

// TODO: Error handling, Pending UI
const clientAction = async ({ request, params }: ClientActionFunctionArgs) => {
  const { accountId } = params;
  invariant(accountId, 'Missing accountId param');
  listEnvironmentsWithCache.invalidate({ accountId });

  const { data } = await createEnvironment({ accountId });
  return redirect(
    `/accounts/${params.accountId}/environments/${data?.environmentId}`
  );
};

function Component() {
  return (
    <>
      <LayoutOutlet zone={LayoutZone.AppBar}>
        <EnvironmentSelector />
      </LayoutOutlet>
      <Outlet />
    </>
  );
}

export const environments = { clientAction, clientLoader, Component };
