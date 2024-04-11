import createClient from 'openapi-fetch';
import type { Middleware } from 'openapi-fetch';
import type { paths } from './api';
import { getAccessToken, logOut } from '@restate/util/auth';
const client = createClient<paths>({
  baseUrl: process.env.RESTATE_CLOUD_API_URL,
});

const authMiddleware: Middleware = {
  async onRequest(req, options) {
    req.headers.set('Authorization', `Bearer ${getAccessToken()}`);
    return req;
  },
  async onResponse(res, options) {
    // User is not authenticated
    if (res.status === 401) {
      logOut();
    }
    return res;
  },
};

client.use(authMiddleware);

export default client;
