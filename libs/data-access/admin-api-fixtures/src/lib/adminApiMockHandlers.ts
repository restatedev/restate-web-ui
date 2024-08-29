import type * as adminApi from '@restate/data-access/admin-api/spec';
import { http, HttpResponse } from 'msw';
import { adminApiDb } from './adminApiDb';

type FormatParameterWithColon<S extends string> =
  S extends `${infer A}{${infer P}}${infer B}` ? `${A}:${P}${B}` : S;
type GetPath<S extends keyof adminApi.paths> = FormatParameterWithColon<
  keyof Pick<adminApi.paths, S>
>;

const listDeploymentsHandler = http.get<
  never,
  never,
  adminApi.operations['list_deployments']['responses']['200']['content']['application/json'],
  GetPath<'/deployments'>
>('/deployments', async () => {
  const deployments = adminApiDb.deployment.getAll();

  return HttpResponse.json({
    deployments: deployments.map((deployment) => ({
      id: deployment.id,
      services: deployment.services,
    })),
  });
});

export const cloudApiMockHandlers = [listDeploymentsHandler];
