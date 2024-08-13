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
      const { data, error, response } = await destroyEnvironment({
        accountId,
        environmentId,
        headers: request.headers,
      });

      if (data) {
        return json({});
      } else {
        return new Response(JSON.stringify(error), { status: response.status });
      }
    }

    default:
      return json({}, { status: 501 });
  }
};
