import { ClientLoaderFunctionArgs, redirect } from '@remix-run/react';
import { listAccounts } from '@restate/data-access/cloud-api-client';

export const loader = async ({ request, params }: ClientLoaderFunctionArgs) => {
  const { data: accountsList } = await listAccounts();

  const accounts = accountsList?.accounts ?? [];

  if (accounts.length > 0) {
    return redirect(`/accounts/${accounts.at(0)?.accountId}/environments`);
  }
  return redirect('/accounts');
};

export function Component() {
  return null;
}
