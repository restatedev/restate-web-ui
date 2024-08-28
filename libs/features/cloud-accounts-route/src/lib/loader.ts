import {
  ClientLoaderFunctionArgs,
  redirect,
  ShouldRevalidateFunction,
} from '@remix-run/react';
import { cloudApi } from '@restate/data-access/cloud/api-client';
import { dehydrate, QueryClient } from '@tanstack/react-query';
import { json } from '@remix-run/cloudflare';

export const clientLoader = async ({
  request,
  params,
}: ClientLoaderFunctionArgs) => {
  const queryClient = new QueryClient();
  const accountsList = await queryClient.fetchQuery(cloudApi.listAccounts());
  const { accounts } = accountsList;
  const isAccountIdParamValid = accounts.some(
    ({ accountId }) => params.accountId === accountId
  );

  if (isAccountIdParamValid) {
    return json({
      dehydratedState: dehydrate(queryClient),
    });
  }

  if (accounts.length > 0) {
    return redirect(`/accounts/${accounts.at(0)?.accountId}/environments`);
  } else if (params.accountId) {
    return redirect('/accounts');
  } else {
    return json({
      dehydratedState: dehydrate(queryClient),
    });
  }
};

// TODO
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
  if (
    currentUrl.searchParams.get('createApiKey') !==
      nextUrl.searchParams.get('createApiKey') ||
    currentUrl.searchParams.get('deleteApiKey') !==
      nextUrl.searchParams.get('deleteApiKey') ||
    (!currentUrl.searchParams.get('createEnvironment') &&
      nextUrl.searchParams.get('createEnvironment')) ||
    (!currentUrl.searchParams.get('deleteEnvironment') &&
      nextUrl.searchParams.get('deleteEnvironment')) ||
    (!currentUrl.searchParams.get('createAccount') &&
      nextUrl.searchParams.get('createAccount'))
  ) {
    return false;
  }
  return defaultShouldRevalidate;
};
