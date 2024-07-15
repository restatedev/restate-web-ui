import { ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { destroyEnvironment } from '@restate/data-access/cloud/api-client';
import invariant from 'tiny-invariant';

export const action = async ({
  request,
  params,
  context,
}: ActionFunctionArgs) => {
  const accountId = params.accountId;
  const environmentId = params.environmentId;
  invariant(accountId, 'Missing accountId param');
  invariant(environmentId, 'Missing environmentId param');

  switch (request.method) {
    case 'DELETE': {
      const response = await destroyEnvironment({
        accountId: accountId as string,
        environmentId: environmentId as string,
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
