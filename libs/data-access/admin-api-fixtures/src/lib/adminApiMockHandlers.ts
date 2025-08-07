import * as adminApi from '@restate/data-access/admin-api/spec';
import { http, HttpResponse } from 'msw';
import { adminApiDb, getName } from './adminApiDb';

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
  const deployments = adminApiDb.deployment
    .getAll()
    .filter(({ dryRun }) => !dryRun);
  return HttpResponse.json({
    deployments: deployments.map((deployment) => ({
      id: deployment.id,
      services: adminApiDb.service
        .findMany({
          where: { deployment: { id: { equals: deployment.id } } },
        })
        .map((service) => ({
          name: service.name,
          deployment_id: deployment.id,
          public: service.public,
          revision: service.revision,
          ty: service.ty,
          idempotency_retention: service.idempotency_retention,
          workflow_completion_retention: service.idempotency_retention,
        })),
      uri: deployment.endpoint,
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
  const requestEndpoint =
    'uri' in requestBody ? requestBody.uri : requestBody.arn;
  const existingDeployment = adminApiDb.deployment.findFirst({
    where: {
      endpoint: {
        equals: requestEndpoint,
      },
      dryRun: {
        equals: true,
      },
    },
  });

  if (existingDeployment) {
    adminApiDb.deployment.update({
      where: {
        id: {
          equals: existingDeployment.id,
        },
      },
      data: { dryRun: false },
    });

    return HttpResponse.json({
      id: existingDeployment.id,
      min_protocol_version: 0,
      max_protocol_version: 0,
      services: adminApiDb.service
        .findMany({
          where: { deployment: { id: { equals: existingDeployment.id } } },
        })
        .map((service) => ({
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
  }

  const newDeployment = adminApiDb.deployment.create({
    dryRun: requestBody.dry_run,
    endpoint: requestEndpoint,
  });
  const services = Array(3)
    .fill(null)
    .map(() =>
      adminApiDb.service.create({
        deployment: newDeployment,
        name: `${getName()}Service`,
        handlers: Array(Math.floor(Math.random() * 6))
          .fill(null)
          .map(() => adminApiDb.handler.create({ name: getName() })),
      }),
    );

  return HttpResponse.json({
    id: newDeployment.id,
    min_protocol_version: 0,
    max_protocol_version: 0,
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

const versionHandler = http.get<
  never,
  never,
  adminApi.operations['version']['responses']['200']['content']['application/json'],
  GetPath<'/version'>
>('/version', async () => {
  return HttpResponse.json({
    version: '1.1.1',
    max_admin_api_version: 1,
    min_admin_api_version: 1,
    ingress_endpoint: 'http://localhost:8080',
  });
});

const deploymentDetailsHandler = http.get<
  adminApi.operations['get_deployment']['parameters']['path'],
  never,
  adminApi.operations['get_deployment']['responses']['200']['content']['application/json'],
  GetPath<'/deployments/{deployment}'>
>('/deployments/:deployment', async ({ params }) => {
  const deployment = adminApiDb.deployment.findFirst({
    where: {
      id: {
        equals: params.deployment,
      },
    },
  });

  if (!deployment) {
    return HttpResponse.json(
      { code: 500, message: 'Server internal error' } as any,
      { status: 500 },
    );
  }
  return HttpResponse.json({
    id: deployment.id,
    services: adminApiDb.service
      .findMany({
        where: { deployment: { id: { equals: deployment.id } } },
      })
      .map((service) => ({
        name: service.name,
        deployment_id: deployment.id,
        public: service.public,
        revision: service.revision,
        ty: service.ty,
        idempotency_retention: service.idempotency_retention,
        workflow_completion_retention: service.idempotency_retention,
        handlers: adminApiDb.handler.findMany({
          where: { service: { name: { equals: service.name } } },
        }),
      })),
    uri: deployment.endpoint,
    protocol_type: 'RequestResponse',
    created_at: new Date().toISOString(),
    http_version: 'HTTP/2.0',
    min_protocol_version: 1,
    max_protocol_version: 1,
  });
});

const serviceDetailsHandler = http.get<
  adminApi.operations['get_service']['parameters']['path'],
  never,
  adminApi.operations['get_service']['responses']['200']['content']['application/json'],
  GetPath<'/services/{service}'>
>('/services/:service', async ({ params }) => {
  const service = adminApiDb.service.findFirst({
    where: {
      name: {
        equals: params.service,
      },
    },
  })!;

  return HttpResponse.json({
    name: service.name,
    deployment_id: service.deployment!.id!,
    public: service.public,
    revision: service.revision,
    ty: service.ty,
    idempotency_retention: service.idempotency_retention,
    workflow_completion_retention: service.idempotency_retention,
    handlers: adminApiDb.handler.findMany({
      where: { service: { name: { equals: service.name } } },
    }),
  });
});

export const adminApiMockHandlers = [
  listDeploymentsHandler,
  healthHandler,
  openApiHandler,
  registerDeploymentHandler,
  versionHandler,
  deploymentDetailsHandler,
  serviceDetailsHandler,
];
