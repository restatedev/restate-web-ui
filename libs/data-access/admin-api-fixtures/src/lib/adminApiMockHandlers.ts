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

function ruleRows(pattern?: string, includeLastModified = false) {
  return Array.from(limitRules.values())
    .filter((rule) => pattern === undefined || rule.pattern === pattern)
    .map((rule) => {
      const row = {
        pattern: rule.pattern,
        concurrency: rule.limits.concurrency ?? null,
        description: rule.description,
        disabled: rule.disabled,
        version: rule.version,
      };
      return includeLastModified
        ? {
            ...row,
            last_modified: new Date(
              rule.last_modified_millis_since_epoch,
            ).toISOString(),
          }
        : row;
    });
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

const MOCK_RULE_MATCHES: Record<
  string,
  Array<{
    scope: string;
    l1?: string;
    l2?: string;
    level: string;
    usage: number;
    limit: number | null;
    waiters: number;
  }>
> = {
  '*': [
    {
      scope: 'orders',
      level: 'scope',
      usage: 100,
      limit: 100,
      waiters: 120,
    },
    {
      scope: 'webhooks',
      level: 'scope',
      usage: 100,
      limit: 100,
      waiters: 30,
    },
    {
      scope: 'emails',
      level: 'scope',
      usage: 40,
      limit: 100,
      waiters: 0,
    },
    {
      scope: 'exports',
      level: 'scope',
      usage: 12,
      limit: 100,
      waiters: 0,
    },
  ],
  'checkout/*': [
    {
      scope: 'checkout',
      l1: 'cart',
      level: 'level1',
      usage: 25,
      limit: 25,
      waiters: 60,
    },
    {
      scope: 'checkout',
      l1: 'session',
      level: 'level1',
      usage: 10,
      limit: 25,
      waiters: 0,
    },
  ],
  'payments/charge': [
    {
      scope: 'payments',
      l1: 'charge',
      level: 'level1',
      usage: 8,
      limit: 8,
      waiters: 48,
    },
  ],
};

function userLimitRows(pattern?: string): UserLimitRowMock[] {
  const rows: UserLimitRowMock[] = [];
  Array.from(limitRules.values())
    .filter((rule) => !rule.disabled)
    .filter((rule) => pattern === undefined || rule.pattern === pattern)
    .forEach((rule) => {
      const concurrency = rule.limits.concurrency ?? null;
      const matches = MOCK_RULE_MATCHES[rule.pattern] ?? [
        {
          scope: rule.pattern.split('/')[0] ?? 'default',
          level: 'scope',
          usage: concurrency ?? 6,
          limit: concurrency,
          waiters: 0,
        },
      ];
      for (const match of matches) {
        const limit = match.limit ?? concurrency;
        rows.push({
          scope: match.scope,
          l1: match.l1 ?? null,
          l2: match.l2 ?? null,
          level: match.level,
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

function filteredUserLimitRows(sql: string) {
  const scope = getSqlStringFilter(sql, 'scope');
  const l1 = getSqlStringFilter(sql, 'l1');
  const l2 = getSqlStringFilter(sql, 'l2');
  const requiresNullL1 = /\bl1\s+IS\s+NULL\b/i.test(sql);
  const requiresNullL2 = /\bl2\s+IS\s+NULL\b/i.test(sql);
  return userLimitRows(getSqlStringFilter(sql, 'rule_pattern')).filter(
    (row) =>
      (scope === undefined || row.scope === scope) &&
      (l1 === undefined || row.l1 === l1) &&
      (l2 === undefined || row.l2 === l2) &&
      (!requiresNullL1 || row.l1 === null) &&
      (!requiresNullL2 || row.l2 === null),
  );
}

type LimitTargetRowMock = {
  id: string;
  service_name: string;
  scope: string;
  limit_key: string | null;
  queue_is_paused: boolean;
  num_running: number;
  num_inbox: number;
  num_suspended: number;
  num_paused: number;
  last_finish_at: string | null;
  last_attempt_at: string | null;
  last_enqueued_at: string | null;
  head_entry_id: string | null;
  status: string;
  blocked_on: string | null;
  blocked_rule: string | null;
  blocked_level: string | null;
};

const now = Date.now();
const MOCK_LIMIT_TARGETS: LimitTargetRowMock[] = [
  {
    id: 'vq_orders_priority',
    service_name: 'OrderProcessor',
    scope: 'orders',
    limit_key: 'priority',
    queue_is_paused: false,
    num_running: 42,
    num_inbox: 860,
    num_suspended: 4,
    num_paused: 0,
    last_finish_at: new Date(now - 210).toISOString(),
    last_attempt_at: new Date(now - 120).toISOString(),
    last_enqueued_at: new Date(now - 80).toISOString(),
    head_entry_id: 'inv_orders_priority_head',
    status: 'blocked',
    blocked_on: 'concurrency_rules',
    blocked_rule: '*',
    blocked_level: 'scope',
  },
  {
    id: 'vq_orders_standard',
    service_name: 'OrderProcessor',
    scope: 'orders',
    limit_key: 'standard',
    queue_is_paused: false,
    num_running: 36,
    num_inbox: 574,
    num_suspended: 2,
    num_paused: 0,
    last_finish_at: new Date(now - 460).toISOString(),
    last_attempt_at: new Date(now - 260).toISOString(),
    last_enqueued_at: new Date(now - 140).toISOString(),
    head_entry_id: 'inv_orders_standard_head',
    status: 'blocked',
    blocked_on: 'concurrency_rules',
    blocked_rule: '*',
    blocked_level: 'scope',
  },
  {
    id: 'vq_orders_reconciliation',
    service_name: 'OrderReconciliation',
    scope: 'orders',
    limit_key: null,
    queue_is_paused: false,
    num_running: 22,
    num_inbox: 138,
    num_suspended: 7,
    num_paused: 0,
    last_finish_at: new Date(now - 920).toISOString(),
    last_attempt_at: new Date(now - 710).toISOString(),
    last_enqueued_at: new Date(now - 340).toISOString(),
    head_entry_id: 'inv_orders_reconciliation_head',
    status: 'ready',
    blocked_on: null,
    blocked_rule: null,
    blocked_level: null,
  },
  {
    id: 'vq_checkout_cart_guest',
    service_name: 'Checkout',
    scope: 'checkout',
    limit_key: 'cart/guest',
    queue_is_paused: false,
    num_running: 14,
    num_inbox: 420,
    num_suspended: 0,
    num_paused: 0,
    last_finish_at: new Date(now - 330).toISOString(),
    last_attempt_at: new Date(now - 190).toISOString(),
    last_enqueued_at: new Date(now - 100).toISOString(),
    head_entry_id: 'inv_checkout_cart_guest_head',
    status: 'blocked',
    blocked_on: 'concurrency_rules',
    blocked_rule: 'checkout/*',
    blocked_level: 'level1',
  },
  {
    id: 'vq_checkout_cart_member',
    service_name: 'Checkout',
    scope: 'checkout',
    limit_key: 'cart/member',
    queue_is_paused: false,
    num_running: 11,
    num_inbox: 198,
    num_suspended: 3,
    num_paused: 0,
    last_finish_at: new Date(now - 680).toISOString(),
    last_attempt_at: new Date(now - 440).toISOString(),
    last_enqueued_at: new Date(now - 230).toISOString(),
    head_entry_id: 'inv_checkout_cart_member_head',
    status: 'scheduled',
    blocked_on: null,
    blocked_rule: null,
    blocked_level: null,
  },
  {
    id: 'vq_payments_charge',
    service_name: 'PaymentProcessor',
    scope: 'payments',
    limit_key: 'charge',
    queue_is_paused: false,
    num_running: 8,
    num_inbox: 48,
    num_suspended: 1,
    num_paused: 0,
    last_finish_at: new Date(now - 240).toISOString(),
    last_attempt_at: new Date(now - 150).toISOString(),
    last_enqueued_at: new Date(now - 60).toISOString(),
    head_entry_id: 'inv_payments_charge_head',
    status: 'blocked',
    blocked_on: 'concurrency_rules',
    blocked_rule: 'payments/charge',
    blocked_level: 'level1',
  },
];

function getSqlLikeFilter(sql: string, column: string) {
  const match = new RegExp(`${column}\\s+LIKE\\s+'((?:''|[^'])*)'`, 'i').exec(
    sql,
  );
  return match ? unquoteSqlString(match[1] ?? '') : undefined;
}

function limitTargetRows(sql: string) {
  const scope = getSqlStringFilter(sql, 'm.scope');
  const limitKey = getSqlStringFilter(sql, 'm.limit_key');
  const limitKeyPrefix = getSqlLikeFilter(sql, 'm.limit_key')?.replace(
    /\/%$/,
    '',
  );
  return MOCK_LIMIT_TARGETS.filter((target) => {
    if (target.scope !== scope) return false;
    if (limitKeyPrefix) {
      return (
        target.limit_key === limitKey ||
        target.limit_key?.startsWith(`${limitKeyPrefix}/`)
      );
    }
    return limitKey === undefined || target.limit_key === limitKey;
  });
}

function userLimitCounterSummaryRows() {
  const summaries = new Map<
    string,
    {
      rule_pattern: string;
      num_counters: number;
      num_counters_with_waiters: number;
    }
  >();

  for (const counter of userLimitRows()) {
    const summary = summaries.get(counter.rule_pattern) ?? {
      rule_pattern: counter.rule_pattern,
      num_counters: 0,
      num_counters_with_waiters: 0,
    };
    summary.num_counters += 1;
    summary.num_counters_with_waiters += Number(counter.num_waiters > 0);
    summaries.set(counter.rule_pattern, summary);
  }

  return Array.from(summaries.values());
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
      rows: ruleRows(
        getSqlStringFilter(sql, 'pattern'),
        /\blast_modified\b/i.test(sql),
      ),
    } as any);
  }

  if (/\bFROM\s+sys_user_limits\b/i.test(sql)) {
    return HttpResponse.json({
      rows: /\bCOUNT\s*\(\s*\*\s*\)/i.test(sql)
        ? userLimitCounterSummaryRows()
        : filteredUserLimitRows(sql),
    } as any);
  }

  if (/\bFROM\s+sys_vqueue_meta\s+m\b/i.test(sql)) {
    return HttpResponse.json({ rows: limitTargetRows(sql) } as any);
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
