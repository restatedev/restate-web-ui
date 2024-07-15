import { ActionFunctionArgs, json } from '@remix-run/cloudflare';
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
      const response = await deleteAccount({
        accountId: accountId as string,
        headers: request.headers,
      });

      if (response.data) {
        return json({});
      } else {
        return json({ error: response.error }, { status: 500 });
      }
    }

    default:
      return json({}, { status: 501 });
  }
};
