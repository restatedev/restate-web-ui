// Side-effect: registers auth + error middleware on the openapi-fetch client.
import './lib/api/middleware';

export * from './lib/api/client';
export * from './lib/api/adminApi';
export * from './lib/api/meta';
export * from './lib/AdminBaseUrlProvider';
export * from './lib/APIStatusProvider';
export * from './lib/api/basicHooks';
export * from './lib/api/hookTypes';
export * from './lib/api/serviceSerde';
export { client } from './lib/api/client';
