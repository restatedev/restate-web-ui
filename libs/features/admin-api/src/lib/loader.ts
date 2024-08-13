import { describeEnvironment } from '@restate/data-access/cloud/api-client';
import { getAdminUrl } from './adminCookie';
import invariant from 'tiny-invariant';
import { LoaderFunction } from '@remix-run/cloudflare';

export const loader: LoaderFunction = async ({ request, params }) => {
  const { accountId, environmentId } = params;
  invariant(accountId, 'Missing accountId param');
  invariant(environmentId, 'Missing environmentId param');
  let adminURL = await getAdminUrl(request);
  if (!adminURL) {
    const { data, error, response } = await describeEnvironment({
      accountId,
      environmentId,
      headers: request.headers,
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
    headers: request.headers,
  });

  return response;
};
