import { json, LoaderFunction } from '@remix-run/cloudflare';
import { describeEnvironment } from '@restate/data-access/cloud/api-client';
import { adminUrlCookie } from '@restate/features/admin-api';
import invariant from 'tiny-invariant';

export const loader: LoaderFunction = async ({ params, request }) => {
  const { accountId, environmentId } = params;
  invariant(accountId, 'Missing accountId param');
  invariant(environmentId, 'Missing environmentId param');

  const { data, error, response } = await describeEnvironment({
    accountId,
    environmentId,
    headers: request.headers,
  });

  if (error) {
    return new Response(JSON.stringify(error), { status: response.status });
  }

  return json(data, {
    headers: {
      'Set-Cookie': await adminUrlCookie.serialize(data?.adminBaseUrl, {
        path: `/api/accounts/${accountId}/environments/${environmentId}/admin`,
      }),
    },
  });
};
