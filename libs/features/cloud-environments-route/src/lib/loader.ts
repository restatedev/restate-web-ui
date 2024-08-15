import {
  ClientLoaderFunctionArgs,
  ShouldRevalidateFunction,
  redirect,
} from '@remix-run/react';
import invariant from 'tiny-invariant';
import { cloudApi } from '@restate/data-access/cloud/api-client';
import { dehydrate, QueryClient } from '@tanstack/react-query';
import { json } from '@remix-run/cloudflare';
import { withAuth } from '@restate/util/auth';

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
  if (!nextParams.environmentId) {
    return true;
  }
  return defaultShouldRevalidate;
};

export const clientLoader = withAuth(
  async ({ request, params }: ClientLoaderFunctionArgs) => {
    const { accountId } = params;
    invariant(accountId, 'Missing accountId param');
    const queryClient = new QueryClient();
    const environmentList = await queryClient.fetchQuery(
      cloudApi.listEnvironments({ accountId })
    );
    const environments = environmentList?.environments ?? [];

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

    return json({
      dehydratedState: dehydrate(queryClient),
    });
  }
);
