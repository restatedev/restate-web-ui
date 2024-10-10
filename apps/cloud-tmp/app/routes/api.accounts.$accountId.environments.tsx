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
  const headers = request.headers;
  headers.set('Content-Type', 'application/json');

  switch (request.method) {
    case 'GET': {
      const { data, response, error } = await listEnvironments({
        accountId: accountId as string,
        headers,
      });

      if (data) {
        return json({ environments: data.environments });
      } else {
        return new Response(JSON.stringify({ errors: [error] }), {
          status: response.status,
          headers: { 'content-type': 'application/json' },
        });
      }
    }

    default:
      return new Response('', { status: 501 });
  }
};