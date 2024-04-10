import {
  ClientActionFunctionArgs,
  ClientLoaderFunctionArgs,
  Form,
  NavLink,
  Outlet,
  redirect,
  useLoaderData,
} from '@remix-run/react';
import {
  createAccount,
  listAccounts,
} from '@restate/data-access/cloud-api-client';
import { Button } from '@restate/ui/button';

const clientLoader = async ({ request, params }: ClientLoaderFunctionArgs) => {
  const { data: accountsList } = await listAccounts();
  const accounts = accountsList?.accounts ?? [];
  const isAccountIdValid = accounts.some(
    ({ accountId }) => params.accountId === accountId
  );

  if (isAccountIdValid) {
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
  const { data } = await createAccount();
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
      <hr className="my-3" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr' }}>
        <div id="b">
          <ul>
            {accounts?.map((acc) => (
              <li key={acc.accountId}>
                <NavLink
                  to={`/accounts/${acc.accountId}/environments`}
                  className={({ isActive }) =>
                    isActive ? 'bg-gray-50 text-indigo-600' : ''
                  }
                >
                  {acc.accountId}
                </NavLink>
              </li>
            ))}
          </ul>
          <Form method="post">
            <Button type="submit">Create Account</Button>
          </Form>
        </div>
        <div id="a">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export const accounts = { clientAction, clientLoader, Component };
