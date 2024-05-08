import createClient from 'openapi-fetch';
import type { Middleware } from 'openapi-fetch';
import type { paths } from './api';
import { getAccessToken, logOut } from '@restate/util/auth';
import { CLOUD_API_BASE_URL } from './baseUrl';
import { UnauthorizedError } from './UnauthorizedError';

const client = createClient<paths>({
  baseUrl: CLOUD_API_BASE_URL,
});

const authMiddleware: Middleware = {
  async onRequest(req, options) {
    req.headers.set('Authorization', `Bearer ${getAccessToken()}`);
    return req;
  },
  async onResponse(res, options) {
    // User is not authenticated
    if (res.status === 401) {
      logOut({ persistRedirectUrl: true });
      throw new UnauthorizedError();
    }
    return res;
  },
};

client.use(authMiddleware);

export default client;
