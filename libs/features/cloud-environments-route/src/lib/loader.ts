import {
  ClientLoaderFunctionArgs,
  ShouldRevalidateFunction,
  defer,
  redirect,
} from '@remix-run/react';
import invariant from 'tiny-invariant';
import {
  describeEnvironmentWithCache,
  listEnvironmentsWithCache,
} from './apis';
import {
  describeEnvironment,
  listEnvironments,
} from '@restate/data-access/cloud/api-client';

type DescribeEnvironmentDetails = {
  [key: string]: ReturnType<typeof describeEnvironment>;
};
type LoaderResponse = Omit<DescribeEnvironmentDetails, 'environmentList'> & {
  environmentList: Awaited<ReturnType<typeof listEnvironments>>;
};

export const shouldRevalidate: ShouldRevalidateFunction = ({
  actionResult,
  currentParams,
  currentUrl,
  defaultShouldRevalidate,
  formAction,
  formData,
  formEncType,
  formMethod,
  nextParams,
  nextUrl,
}) => {
  console.log(currentUrl.pathname, nextUrl.pathname);

  return currentUrl.pathname !== nextUrl.pathname;
};

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

  const environmentsWithDetailsPromises = environments
    .map((environment) => ({
      [environment.environmentId]: describeEnvironmentWithCache.fetch({
        environmentId: environment.environmentId,
        accountId,
      }),
    }))
    .reduce((p, c) => ({ ...p, ...c }), {});
  return defer({
    environmentList,
    ...environmentsWithDetailsPromises,
  } as LoaderResponse);
};
