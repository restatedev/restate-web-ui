import createClient from 'openapi-fetch';
import type { Middleware } from 'openapi-fetch';
import type { paths } from './api';
import { getAccessToken, getBaseUrl } from './utils';

const client = createClient<paths>({ baseUrl: getBaseUrl() });

const authMiddleware: Middleware = {
  async onRequest(req, options) {
    req.headers.set('Authorization', `Bearer ${getAccessToken()}`);
    return req;
  },
};

client.use(authMiddleware);

export default client;
