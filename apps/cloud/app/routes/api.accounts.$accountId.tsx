import { ActionFunctionArgs, redirect } from '@remix-run/cloudflare';
import { deleteAccount } from '@restate/data-access/cloud/api-client';
import invariant from 'tiny-invariant';

export const action = async ({
  request,
  params,
  context,
}: ActionFunctionArgs) => {
  const accountId = params.accountId;
  invariant(accountId, 'Missing accountId param');

  switch (request.method) {
    case 'DELETE': {
      await deleteAccount({
        accountId: accountId as string,
        headers: request.headers,
      });

      return redirect('/accounts');
    }

    default:
      return;
  }
};

export default () => null;
