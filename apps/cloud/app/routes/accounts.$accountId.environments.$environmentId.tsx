import { json } from '@remix-run/cloudflare';
import { describeEnvironment } from '@restate/data-access/cloud/api-client';
import { adminUrlCookie } from '@restate/features/admin-api';
import { settings } from '@restate/features/cloud/settings-route';
import { withCookieAuth } from '@restate/util/auth';
import invariant from 'tiny-invariant';

export const loader = withCookieAuth(async ({ params, authToken }) => {
  const { accountId, environmentId } = params;
  invariant(accountId, 'Missing accountId param');
  invariant(environmentId, 'Missing environmentId param');

  const { data, error, response } = await describeEnvironment({
    accountId,
    environmentId,
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
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
});
export const clientAction = settings.clientAction;
export default settings.Component;
