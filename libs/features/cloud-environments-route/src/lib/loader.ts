import { ClientLoaderFunctionArgs, defer, redirect } from '@remix-run/react';
import invariant from 'tiny-invariant';
import {
  describeEnvironmentWithCache,
  listEnvironmentsWithCache,
} from './apis';

export const clientLoader = async ({
  request,
  params,
}: ClientLoaderFunctionArgs) => {
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
    invariant(params.environmentId, 'Missing environmentId param');
    const environmentDetailsPromise = describeEnvironmentWithCache.fetch({
      accountId,
      environmentId: params.environmentId,
    });
    return defer({ environments, environmentDetailsPromise });
  }

  if (environments.length > 0) {
    return redirect(
      `/accounts/${params.accountId}/environments/${
        environments.at(0)?.environmentId
      }`
    );
  }

  return defer({ environments, environmentDetailsPromise: undefined });
};
