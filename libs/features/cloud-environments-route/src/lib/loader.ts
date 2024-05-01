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
  const environmentList = await listEnvironmentsWithCache.fetch({
    accountId,
  });

  if (environmentList.error) {
    throw new Response(environmentList.error.message, {
      status: environmentList.error.code,
    });
  }
  const environments = environmentList?.data?.environments ?? [];

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

  if (!isEnvironmentIdParamValid && params.environmentId) {
    return redirect(`/accounts/${params.accountId}/environments`);
  }

  return defer({
    environmentList,
    environmentsWithDetailsPromises,
  });
};
