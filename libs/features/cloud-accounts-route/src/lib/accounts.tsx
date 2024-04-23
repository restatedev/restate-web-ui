import {
  ClientActionFunctionArgs,
  ClientLoaderFunctionArgs,
  Outlet,
  redirect,
  useLoaderData,
} from '@remix-run/react';
import {
  Account,
  createAccount,
  listAccounts,
} from '@restate/data-access/cloud/api-client';
import { AccountSelector } from './AccountSelector';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { withCache } from '@restate/util/cache';

const listAccountsWithCache = withCache(listAccounts);

const clientLoader = async ({ request, params }: ClientLoaderFunctionArgs) => {
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

// TODO: Error handling, Pending UI
const clientAction = async ({ request, params }: ClientActionFunctionArgs) => {
  listAccountsWithCache.invalidate();
  const { data } = await createAccount({});
  return redirect(`/accounts/${data?.accountId}/environments`);
};

function Component() {
  const { accounts } = useLoaderData<typeof clientLoader>();

  return (
    <>
      <LayoutOutlet zone={LayoutZone.AppBar}>
        <AccountSelector accounts={accounts} />
      </LayoutOutlet>
      <Outlet />
    </>
  );
}

export const accounts = { clientAction, clientLoader, Component };
