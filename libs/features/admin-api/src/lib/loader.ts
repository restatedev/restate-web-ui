import { describeEnvironment } from '@restate/data-access/cloud/api-client';
import { getAdminUrl } from './adminCookie';
import invariant from 'tiny-invariant';
import { LoaderFunction } from '@remix-run/cloudflare';
import { getAuthCookie } from '@restate/util/auth';

const adminApiProxy = async ({
  request,
  params,
}: {
  request: Request;
  params: Params;
}) => {
  const { accountId, environmentId } = params;
  invariant(typeof accountId === 'string', 'Missing accountId param');
  invariant(typeof environmentId === 'string', 'Missing environmentId param');
  let adminBaseUrl = await getAdminUrl(request);
  if (!adminBaseUrl) {
    const { data, error, response } = await describeEnvironment({
      accountId,
      environmentId,
      headers: request.headers,
    });

    if (data?.adminBaseUrl) {
      adminBaseUrl = data?.adminBaseUrl;
    } else {
      return new Response(JSON.stringify({ errors: [error] }), {
        status: response.status,
        headers: { 'content-type': 'application/json' },
      });
    }
  }
  const adminURL = new URL(adminBaseUrl);

  // Remove port for hosted environments
  if (adminURL.hostname.includes('restate.cloud')) {
    adminURL.port = '';
  }
  const path = request.url.split(`${environmentId}/admin`).at(1);

  const response = await fetch(
    `${adminURL.href.replace(/\/$/, '')}${path?.substring(0)}`,
    {
      method: request.method,
      headers: {
        Accept: 'json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getAuthCookie(request)}`,
        'x-restate-target': 'admin',
      },
    }
  );

  return response;
};

export const loader = adminApiProxy;
export const action = adminApiProxy;
