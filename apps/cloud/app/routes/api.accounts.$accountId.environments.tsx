import { LoaderFunctionArgs, json } from '@remix-run/cloudflare';
import { listEnvironments } from '@restate/data-access/cloud/api-client';
import invariant from 'tiny-invariant';

export const loader = async ({
  request,
  params,
  context,
}: LoaderFunctionArgs) => {
  const accountId = params.accountId;
  invariant(accountId, 'Missing accountId param');

  switch (request.method) {
    case 'GET': {
      const response = await listEnvironments({
        accountId: accountId as string,
        headers: request.headers,
      });

      if (response.data) {
        return json({ environments: response.data.environments });
      } else {
        return json({ error: response.error }, { status: 500 });
      }
    }

    default:
      return json({}, { status: 501 });
  }
};
