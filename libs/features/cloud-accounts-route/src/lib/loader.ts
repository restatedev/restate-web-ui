import { ClientLoaderFunctionArgs, redirect } from '@remix-run/react';
import { listAccountsWithCache } from './apis';

export const clientLoader = async ({
  request,
  params,
}: ClientLoaderFunctionArgs) => {
  const { data: accountsList } = await listAccountsWithCache.fetch();
  const accounts = accountsList?.accounts ?? [];
  const isAccountIdParamValid = accounts.some(
    ({ accountId }) => params.accountId === accountId
  );

  if (isAccountIdParamValid) {
    return { accounts };
  }

  if (accounts.length > 0) {
    return redirect(`/accounts/${accounts.at(0)?.accountId}/environments`);
  } else {
    return { accounts };
  }
};
