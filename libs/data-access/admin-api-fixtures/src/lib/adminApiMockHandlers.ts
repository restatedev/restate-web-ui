import * as adminApi from '@restate/data-access/admin-api/spec';
import { http, HttpResponse } from 'msw';
import { adminApiDb } from './adminApiDb';
import { faker } from '@faker-js/faker';

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
      uri: faker.internet.url(),
      protocol_type: 'RequestResponse',
      created_at: new Date().toISOString(),
      http_version: 'HTTP/2.0',
      min_protocol_version: 1,
      max_protocol_version: 1,
    })),
  });
});

const registerDeploymentHandler = http.post<
  never,
  adminApi.operations['create_deployment']['requestBody']['content']['application/json'],
  adminApi.operations['create_deployment']['responses']['201']['content']['application/json'],
  GetPath<'/deployments'>
>('/deployments', async ({ request }) => {
  const requestBody = await request.json();
  const newDeployment = adminApiDb.deployment.create({});
  const services = Array(3)
    .fill(null)
    .map(() => adminApiDb.service.create({ deployment: newDeployment }));

  return HttpResponse.json({
    id: newDeployment.id,
    services: services.map((service) => ({
      name: service.name,
      deployment_id: service.deployment!.id,
      public: service.public,
      revision: service.revision,
      ty: service.ty,
      idempotency_retention: service.idempotency_retention,
      workflow_completion_retention: service.idempotency_retention,
      handlers: service.handlers.map((handler) => ({
        name: handler.name,
        ty: handler.ty,
        input_description: handler.input_description,
        output_description: handler.output_description,
      })),
    })),
  });
});

const healthHandler = http.get<
  never,
  never,
  adminApi.operations['health']['responses']['200']['content'],
  GetPath<'/health'>
>('/health', async () => {
  if (Math.random() < 0.5) {
    return new HttpResponse(null, { status: 500 });
  } else {
    return new HttpResponse(null, { status: 200 });
  }
});

const openApiHandler = http.get<
  never,
  never,
  adminApi.operations['openapi_spec']['responses']['200']['content']['application/json'],
  GetPath<'/openapi'>
>('/openapi', async () => {
  return HttpResponse.json(adminApi.spec as any);
});

export const adminApiMockHandlers = [
  listDeploymentsHandler,
  healthHandler,
  openApiHandler,
  registerDeploymentHandler,
];
