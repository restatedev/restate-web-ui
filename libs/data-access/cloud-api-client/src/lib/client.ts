import createClient from 'openapi-fetch';
import type { Middleware } from 'openapi-fetch';
import type { paths } from './api';
import { getAccessToken } from './utils';

const client = createClient<paths>({ baseUrl: process.env.NX_API_URL });

const authMiddleware: Middleware = {
  async onRequest(req, options) {
    req.headers.set('Authorization', `Bearer ${getAccessToken()}`);
    return req;
  },
};

client.use(authMiddleware);

export default client;
