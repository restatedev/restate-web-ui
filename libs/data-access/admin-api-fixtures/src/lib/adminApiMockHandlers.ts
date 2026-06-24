import * as adminApi from '@restate/data-access/admin-api-spec';
import { http, HttpResponse } from 'msw';
import { adminApiDb, getName } from './adminApiDb';

type RuleResponse = adminApi.components['schemas']['RuleResponse'];
type UpsertRuleRequest = adminApi.components['schemas']['UpsertRuleRequest'];
type DeleteRuleRequest = adminApi.components['schemas']['DeleteRuleRequest'];
type QueryRequest =
  adminApi.operations['query']['requestBody']['content']['application/json'];
type QueryResponse =
  adminApi.operations['query']['responses']['200']['content']['application/json'];

type FormatParameterWithColon<S extends string> =
  S extends `${infer A}{${infer P}}${infer B}` ? `${A}:${P}${B}` : S;
type GetPath<S extends keyof adminApi.paths> = FormatParameterWithColon<
  keyof Pick<adminApi.paths, S>
>;

const limitRules = new Map<string, RuleResponse>(
  [
    {
      pattern: '*',
      description: 'Default cluster concurrency',
      disabled: false,
      version: 1,
      last_modified_millis_since_epoch: Date.now() - 3_600_000,
      limits: { concurrency: 100 },
    },
    {
      pattern: 'checkout/*',
      description: 'Checkout services',
      disabled: false,
      version: 1,
      last_modified_millis_since_epoch: Date.now() - 1_800_000,
      limits: { concurrency: 25 },
    },
    {
      pattern: 'imports/bulk',
      description: 'Paused import jobs',
      disabled: true,
      version: 1,
      last_modified_millis_since_epoch: Date.now() - 900_000,
      limits: { concurrency: 5 },
    },
  ].map((rule) => [rule.pattern, rule]),
);

function conflict(message: string): any {
  return HttpResponse.json({ message } as any, { status: 409 });
}

function checkUpsertPrecondition(
  request: UpsertRuleRequest,
  rule: RuleResponse | undefined,
) {
  const precondition = request.precondition ?? { type: 'none' };
  if (precondition.type === 'none') return true;
  if (precondition.type === 'does_not_exist') return !rule;
  return rule?.version === precondition.version;
}

function toRuleResponse(
  request: UpsertRuleRequest,
  existing: RuleResponse | undefined,
): RuleResponse {
  return {
    pattern: request.pattern,
    description: request.description ?? null,
    disabled: request.disabled ?? false,
    limits: request.limits ?? {},
    version: (existing?.version ?? 0) + 1,
    last_modified_millis_since_epoch: Date.now(),
  };
}

function unquoteSqlString(value: string) {
  return value.replaceAll("''", "'");
}

function getSqlStringFilter(sql: string, column: string) {
  const match = new RegExp(`${column}\\s*=\\s*'((?:''|[^'])*)'`, 'i').exec(sql);
  return match ? unquoteSqlString(match[1] ?? '') : undefined;
}

function ruleRows(pattern?: string) {
  return Array.from(limitRules.values())
    .filter((rule) => pattern === undefined || rule.pattern === pattern)
    .map((rule) => ({
      pattern: rule.pattern,
      concurrency: rule.limits.concurrency ?? null,
      description: rule.description,
      disabled: rule.disabled,
      version: rule.version,
      last_modified_millis_since_epoch: rule.last_modified_millis_since_epoch,
    }));
}

function userLimitRows(pattern?: string) {
  return Array.from(limitRules.values())
    .filter((rule) => !rule.disabled)
    .filter((rule) => pattern === undefined || rule.pattern === pattern)
    .map((rule, index) => {
      const [scope = null, l1 = null, l2 = null] = rule.pattern.split('/');
      const concurrency = rule.limits.concurrency ?? null;
      const usage =
        concurrency == null ? index + 1 : Math.min(index + 1, concurrency);
      return {
        scope,
        l1,
        l2,
        level: 'rule',
        usage,
        concurrency_limit: concurrency,
        rule_pattern: rule.pattern,
        available:
          concurrency == null ? null : Math.max(concurrency - usage, 0),
        num_waiters: 0,
      };
    });
}

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

    const retry_policy: adminApi.Service['retry_policy'] = {
      exponentiation_factor: 2,
      initial_interval: '100ms',
      max_attempts: null,
      max_interval: null,
      on_max_attempts: 'Pause',
    };
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
          journal_retention: service.journal_retention,
          enable_lazy_state: service.enable_lazy_state,
          abort_timeout: '1m',
          inactivity_timeout: '1m',
          retry_policy,
          handlers: service.handlers.map((handler) => ({
            name: handler.name,
            ty: handler.ty,
            input_description: handler.input_description,
            output_description: handler.output_description,
            public: true,
            retry_policy,
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
  const retry_policy: adminApi.Service['retry_policy'] = {
    exponentiation_factor: 2,
    initial_interval: '100ms',
    max_attempts: null,
    max_interval: null,
    on_max_attempts: 'Pause',
  };
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
        public: true,
        retry_policy,
      })),
      journal_retention: '1m',
      inactivity_timeout: '1m',
      abort_timeout: '1m',
      enable_lazy_state: false,
      retry_policy,
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
    features: { vqueues: true },
  });
});

const queryHandler = http.post<
  never,
  QueryRequest,
  QueryResponse,
  GetPath<'/query'>
>('/query', async ({ request }) => {
  const requestBody = await request.json();
  const sql = requestBody.query;

  if (/\bFROM\s+sys_rules\b/i.test(sql)) {
    return HttpResponse.json({
      rows: ruleRows(getSqlStringFilter(sql, 'pattern')),
    } as any);
  }

  if (/\bFROM\s+sys_user_limits\b/i.test(sql)) {
    return HttpResponse.json({
      rows: userLimitRows(getSqlStringFilter(sql, 'rule_pattern')),
    } as any);
  }

  return HttpResponse.json({ message: 'Query is not mocked' } as any, {
    status: 501,
  });
});

const upsertRulesHandler = http.put<
  never,
  UpsertRuleRequest[],
  RuleResponse[],
  GetPath<'/limits/rules'>
>('/limits/rules', async ({ request }) => {
  const requests = await request.json();
  const nextRules = new Map(limitRules);
  const response: RuleResponse[] = [];

  for (const upsert of requests) {
    const existing = nextRules.get(upsert.pattern);
    if (!checkUpsertPrecondition(upsert, existing)) {
      return conflict(`Precondition failed for rule ${upsert.pattern}`);
    }
    const next = toRuleResponse(upsert, existing);
    nextRules.set(next.pattern, next);
    response.push(next);
  }

  limitRules.clear();
  for (const [pattern, rule] of nextRules) {
    limitRules.set(pattern, rule);
  }

  return HttpResponse.json(response);
});

const deleteRulesHandler = http.post<
  never,
  DeleteRuleRequest[],
  string[],
  GetPath<'/limits/rules/bulk-delete'>
>('/limits/rules/bulk-delete', async ({ request }) => {
  const requests = await request.json();
  const nextRules = new Map(limitRules);
  const removed: string[] = [];

  for (const deleteRequest of requests) {
    const existing = nextRules.get(deleteRequest.pattern);
    const expectedVersion = deleteRequest.expected_version;
    if (
      expectedVersion != null &&
      (!existing || existing.version !== expectedVersion)
    ) {
      return conflict(`Precondition failed for rule ${deleteRequest.pattern}`);
    }
  }

  for (const deleteRequest of requests) {
    if (nextRules.delete(deleteRequest.pattern)) {
      removed.push(deleteRequest.pattern);
    }
  }

  limitRules.clear();
  for (const [pattern, rule] of nextRules) {
    limitRules.set(pattern, rule);
  }

  return HttpResponse.json(removed);
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
  const retry_policy: adminApi.Service['retry_policy'] = {
    exponentiation_factor: 2,
    initial_interval: '100ms',
    max_attempts: null,
    max_interval: null,
    on_max_attempts: 'Pause',
  };
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
        handlers: adminApiDb.handler
          .findMany({
            where: { service: { name: { equals: service.name } } },
          })
          .map((handler) => ({ ...handler, retry_policy })),
        retry_policy,
        abort_timeout: '1m',
        inactivity_timeout: '1m',
        enable_lazy_state: false,
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

  const retry_policy: adminApi.Service['retry_policy'] = {
    exponentiation_factor: 2,
    initial_interval: '100ms',
    max_attempts: null,
    max_interval: null,
    on_max_attempts: 'Pause',
  };

  return HttpResponse.json({
    name: service.name,
    deployment_id: service.deployment!.id!,
    public: service.public,
    revision: service.revision,
    ty: service.ty,
    idempotency_retention: service.idempotency_retention,
    workflow_completion_retention: service.idempotency_retention,
    handlers: adminApiDb.handler
      .findMany({
        where: { service: { name: { equals: service.name } } },
      })
      .map((handler) => ({ ...handler, retry_policy })),
    enable_lazy_state: false,
    abort_timeout: '1m',
    inactivity_timeout: '1m',
    retry_policy,
  });
});

export const adminApiMockHandlers = [
  listDeploymentsHandler,
  healthHandler,
  registerDeploymentHandler,
  versionHandler,
  queryHandler,
  upsertRulesHandler,
  deleteRulesHandler,
  deploymentDetailsHandler,
  serviceDetailsHandler,
];
