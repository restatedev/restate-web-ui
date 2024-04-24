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

  const environmentsWithDetailsPromises = environments
    .map((environment) => ({
      [environment.environmentId]: describeEnvironmentWithCache.fetch({
        environmentId: environment.environmentId,
        accountId,
      }),
    }))
    .reduce((p, c) => ({ ...p, ...c }), {});

  const isEnvironmentIdParamValid = environments.some(
    ({ environmentId }) => params.environmentId === environmentId
  );

  if (!isEnvironmentIdParamValid && environments.length > 0) {
    return redirect(
      `/accounts/${params.accountId}/environments/${
        environments.at(0)?.environmentId
      }`
    );
  }

  return defer({
    environments,
    environmentsWithDetailsPromises,
  });
};
