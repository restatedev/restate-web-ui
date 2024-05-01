import { ClientLoaderFunctionArgs, redirect } from '@remix-run/react';
import { listAccountsWithCache } from './apis';

export const clientLoader = async ({
  request,
  params,
}: ClientLoaderFunctionArgs) => {
  const accountsList = await listAccountsWithCache.fetch();
  const accounts = accountsList.data?.accounts ?? [];
  const isAccountIdParamValid = accounts.some(
    ({ accountId }) => params.accountId === accountId
  );

  if (isAccountIdParamValid) {
    return { accountsList };
  }

  if (accounts.length > 0) {
    return redirect(`/accounts/${accounts.at(0)?.accountId}/environments`);
  } else if (params.accountId) {
    return redirect('/accounts');
  } else {
    return { accountsList };
  }
};
