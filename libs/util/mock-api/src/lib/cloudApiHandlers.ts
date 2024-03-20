import type * as cloudApi from '@restate/data-access/cloud-api';
import { http, HttpResponse } from 'msw';

export const cloudApiHandlers = [
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
