import {
  ClientLoaderFunctionArgs,
  redirect,
  ClientActionFunctionArgs,
  useLoaderData,
  useParams,
  NavLink,
  Form,
  Outlet,
} from '@remix-run/react';
import {
  listEnvironments,
  createEnvironment,
} from '@restate/data-access/cloud-api-client';
import { Button } from '@restate/ui/button';
import invariant from 'tiny-invariant';
import { EnvironmentSelector } from './EnvironmentSelector';

const clientLoader = async ({ request, params }: ClientLoaderFunctionArgs) => {
  invariant(params.accountId, 'Missing accountId param');
  const { data: environmentList } = await listEnvironments({
    accountId: params.accountId,
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
  invariant(params.accountId, 'Missing accountId param');
  const { data } = await createEnvironment({ accountId: params.accountId });
  return redirect(
    `/accounts/${params.accountId}/environments/${data?.environmentId}`
  );
};

function Component() {
  const { environments } = useLoaderData<typeof clientLoader>();
  const params = useParams();
  return (
    <div>
      <EnvironmentSelector environments={environments} />
      <Outlet />
    </div>
  );
}

export const environments = { clientAction, clientLoader, Component };
