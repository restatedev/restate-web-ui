import createClient from 'openapi-fetch';
import type { Middleware } from 'openapi-fetch';
import type { paths } from './api';
import { getAccessToken, getAuthCookie, logOut } from '@restate/util/auth';
import { CLOUD_API_BASE_URL } from './baseUrl';
import { UnauthorizedError } from './UnauthorizedError';

const client = createClient<paths>({
  baseUrl: CLOUD_API_BASE_URL,
});

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    if (typeof window !== 'undefined') {
      request.headers.set('Authorization', `Bearer ${getAccessToken()}`);
    } else {
      request.headers.set(
        'Authorization',
        `Bearer ${await getAuthCookie(request)}`
      );
    }
    return request;
  },
  async onResponse({ response }) {
    // User is not authenticated
    if (response.status === 401) {
      logOut({ persistRedirectUrl: true });
      throw new UnauthorizedError();
    }
    return response;
  },
};

client.use(authMiddleware);

export default client;
