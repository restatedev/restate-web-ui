import { http, HttpResponse } from 'msw';
import type * as cloudApi from '@restate/data-access/cloud-api';
import { setupWorker } from 'msw/browser';
import Worker from './mockServiceWorker/mockServiceWorker.js?url';

const handlers = [
  http.post<
    cloudApi.operations['createApiKey']['parameters']['path'],
    cloudApi.operations['createApiKey']['requestBody']['content']['application/json'],
    cloudApi.operations['createApiKey']['responses']['200']['content']['application/json'],
    keyof Pick<cloudApi.paths, '/cloud/{accountId}/CreateApiKey'>
  >('/cloud/:accountId/CreateApiKey' as any, async ({ params, request }) => {
    const requestBody = await request.json();
    return HttpResponse.json({
      accountId: params.accountId,
      environmentId: requestBody.environmentId,
      roleId: requestBody.roleId,
      apiKey: 'my-key',
      state: 'KEY_ACTIVE',
    });
  }),
];

export async function enableMock() {
  return await setupWorker(...handlers).start({
    serviceWorker: {
      url: Worker,
      options: {
        scope: '/',
      },
    },
  });
}
