import { describeEnvironment } from '@restate/data-access/cloud/api-client';
import { getAdminUrl } from './adminCookie';
import { LoaderFunctionArgsWithAuth, withCookieAuth } from '@restate/util/auth';
import invariant from 'tiny-invariant';

export const loader = withCookieAuth(
  async ({ request, params, authToken }: LoaderFunctionArgsWithAuth) => {
    const { accountId, environmentId } = params;
    invariant(accountId, 'Missing accountId param');
    invariant(environmentId, 'Missing environmentId param');
    let adminURL = await getAdminUrl(request);
    if (!adminURL) {
      const { data, error, response } = await describeEnvironment({
        accountId,
        environmentId,
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (data?.adminBaseUrl) {
        adminURL = data?.adminBaseUrl;
      } else {
        return new Response(JSON.stringify(error), { status: response.status });
      }
    }
    const path = request.url.split(`${environmentId}/admin`).at(1);
    const response = await fetch(`${adminURL}${path}`, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    return response;
  }
);
