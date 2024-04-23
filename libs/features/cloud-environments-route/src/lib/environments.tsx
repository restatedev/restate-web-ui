import {
  ClientLoaderFunctionArgs,
  redirect,
  ClientActionFunctionArgs,
  useLoaderData,
  Outlet,
} from '@remix-run/react';
import {
  listEnvironments,
  createEnvironment,
} from '@restate/data-access/cloud/api-client';
import invariant from 'tiny-invariant';
import { EnvironmentSelector } from './EnvironmentSelector';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { withCache } from '@restate/util/cache';

const listEnvironmentsWithCache = withCache(listEnvironments);

const clientLoader = async ({ request, params }: ClientLoaderFunctionArgs) => {
  const { accountId } = params;
  invariant(accountId, 'Missing accountId param');
  const { data: environmentList } = await listEnvironmentsWithCache.fetch({
    accountId,
  });
  const environments = environmentList?.environments ?? [];
  const isEnvironmentIdParamValid = environments.some(
    ({ environmentId }) => params.environmentId === environmentId
  );

  if (isEnvironmentIdParamValid) {
    return { environments };
  }

  if (environments.length > 0) {
    return redirect(
      `/accounts/${params.accountId}/environments/${
        environments.at(0)?.environmentId
      }`
    );
  }

  return { environments };
};

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
  const { environments } = useLoaderData<typeof clientLoader>();
  return (
    <>
      <LayoutOutlet zone={LayoutZone.AppBar}>
        <EnvironmentSelector environments={environments} />
      </LayoutOutlet>
      <Outlet />
    </>
  );
}

export const environments = { clientAction, clientLoader, Component };
