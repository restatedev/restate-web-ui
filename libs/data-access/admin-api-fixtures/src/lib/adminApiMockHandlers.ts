import * as adminApi from '@restate/data-access/admin-api-spec';
import { http, HttpResponse } from 'msw';
import { adminApiDb, getName } from './adminApiDb';

type RuleResponse = adminApi.components['schemas']['RuleResponse'];
type LimitRuleStats = adminApi.components['schemas']['LimitRuleStats'];
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

type WorstCounter = NonNullable<LimitRuleStats['worst_counter']>;

type LimitRuleAggregateRow = {
  rule_pattern: string;
  pending: number;
  matches: number;
  backed_up: number;
};

type WorstCounterRow = WorstCounter & { rule_pattern: string };

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
      pattern: 'payments/charge',
      description: 'Payment charge path',
      disabled: false,
      version: 1,
      last_modified_millis_since_epoch: Date.now() - 1_200_000,
      limits: { concurrency: 8 },
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

type UserLimitRowMock = {
  scope: string | null;
  l1: string | null;
  l2: string | null;
  level: string;
  usage: number;
  concurrency_limit: number | null;
  rule_pattern: string;
  available: number | null;
  num_waiters: number;
};

// Explicit per-rule matches (sys_user_limits rows) tuned to span the depth
// gradient: pale-amber shallow backlogs up to a deep-red 6x match, plus
// no-queue rows. Demonstrates the Pending bar, Depth (x limit) and the
// no-queue/backed-up split in mock mode.
const MOCK_RULE_MATCHES: Record<
  string,
  Array<{ l1: string; usage: number; limit: number | null; waiters: number }>
> = {
  '*': [
    { l1: 'orders', usage: 100, limit: 100, waiters: 120 },
    { l1: 'webhooks', usage: 100, limit: 100, waiters: 30 },
    { l1: 'emails', usage: 40, limit: 100, waiters: 0 },
    { l1: 'exports', usage: 12, limit: 100, waiters: 0 },
  ],
  'checkout/*': [
    { l1: 'cart', usage: 25, limit: 25, waiters: 60 },
    { l1: 'session', usage: 10, limit: 25, waiters: 0 },
  ],
  'payments/charge': [
    { l1: 'visa', usage: 8, limit: 8, waiters: 48 },
    { l1: 'amex', usage: 8, limit: 8, waiters: 6 },
    { l1: 'paypal', usage: 3, limit: 8, waiters: 0 },
  ],
};

function userLimitRows(pattern?: string): UserLimitRowMock[] {
  const rows: UserLimitRowMock[] = [];
  Array.from(limitRules.values())
    .filter((rule) => !rule.disabled)
    .filter((rule) => pattern === undefined || rule.pattern === pattern)
    .forEach((rule) => {
      const [scope = null] = rule.pattern.split('/');
      const concurrency = rule.limits.concurrency ?? null;
      const matches = MOCK_RULE_MATCHES[rule.pattern] ?? [
        { l1: 'key-1', usage: concurrency ?? 6, limit: concurrency, waiters: 0 },
      ];
      for (const match of matches) {
        const limit = match.limit ?? concurrency;
        rows.push({
          scope,
          l1: match.l1,
          l2: null,
          level: 'level1',
          usage: match.usage,
          concurrency_limit: limit,
          rule_pattern: rule.pattern,
          available: limit == null ? null : Math.max(limit - match.usage, 0),
          num_waiters: match.waiters,
        });
      }
    });
  return rows;
}

function userLimitAggregateRows(): LimitRuleAggregateRow[] {
  const stats = new Map<string, LimitRuleAggregateRow>();
  for (const row of userLimitRows()) {
    if (!row.rule_pattern) continue;
    const existing = stats.get(row.rule_pattern) ?? {
      rule_pattern: row.rule_pattern,
      pending: 0,
      matches: 0,
      backed_up: 0,
    };
    const waiters = row.num_waiters ?? 0;
    existing.pending += waiters;
    existing.matches += 1;
    existing.backed_up += waiters > 0 ? 1 : 0;
    stats.set(row.rule_pattern, existing);
  }
  return Array.from(stats.values());
}

function matchDepthRatio(row: UserLimitRowMock) {
  const limit = row.concurrency_limit;
  if (!limit || limit <= 0) return 0;
  return (row.num_waiters ?? 0) / limit;
}

function userLimitWorstRows(): WorstCounterRow[] {
  const worst = new Map<string, { row: UserLimitRowMock; ratio: number }>();
  for (const row of userLimitRows()) {
    const waiters = row.num_waiters ?? 0;
    if (!row.rule_pattern || waiters <= 0) continue;
    const ratio = matchDepthRatio(row);
    const current = worst.get(row.rule_pattern);
    if (!current || ratio > current.ratio) {
      worst.set(row.rule_pattern, { row, ratio });
    }
  }
  return Array.from(worst.values()).map(({ row }) => ({
    rule_pattern: row.rule_pattern,
    scope: row.scope,
    l1: row.l1,
    l2: row.l2,
    level: row.level,
    usage: row.usage,
    concurrency_limit: row.concurrency_limit,
    num_waiters: row.num_waiters,
  }));
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
    if (/\bROW_NUMBER\b/i.test(sql)) {
      return HttpResponse.json({
        rows: userLimitWorstRows(),
      } as any);
    }

    if (/\bGROUP\s+BY\s+rule_pattern\b/i.test(sql)) {
      return HttpResponse.json({
        rows: userLimitAggregateRows(),
      } as any);
    }

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
