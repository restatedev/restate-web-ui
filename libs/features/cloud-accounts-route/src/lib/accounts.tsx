import {
  ClientActionFunctionArgs,
  ClientLoaderFunctionArgs,
  Outlet,
  redirect,
  useLoaderData,
} from '@remix-run/react';
import {
  createAccount,
  listAccounts,
} from '@restate/data-access/cloud-api-client';
import { AccountSelector } from './AccountSelector';

const clientLoader = async ({ request, params }: ClientLoaderFunctionArgs) => {
  const { data: accountsList } = await listAccounts();
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
  const { data } = await createAccount({});
  return redirect(`/accounts/${data?.accountId}/environments`);
};

function Component() {
  const { accounts } = useLoaderData<typeof clientLoader>();

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        lineHeight: '1.8',
        padding: '2rem',
      }}
    >
      <h1 className="text-base font-semibold leading-6 text-gray-900">
        Hello user
      </h1>
      <AccountSelector accounts={accounts} />
      <Outlet />
    </div>
  );
}

export const accounts = { clientAction, clientLoader, Component };
