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

function getSqlLowerStringFilter(sql: string, column: string) {
  const match = new RegExp(
    `LOWER\\(COALESCE\\(${column},\\s*''\\)\\)\\s*=\\s*'((?:''|[^'])*)'`,
    'i',
  ).exec(sql);
  return match ? unquoteSqlString(match[1] ?? '') : undefined;
}

function getSqlLiteralContainsFilter(sql: string, expression: string) {
  const match = new RegExp(
    `strpos\\(LOWER\\(${expression}\\),\\s*'((?:''|[^'])*)'\\)\\s*>\\s*0`,
    'i',
  ).exec(sql);
  return match ? unquoteSqlString(match[1] ?? '') : undefined;
}

function getSqlLikeFilter(sql: string, column: string) {
  const match = new RegExp(
    `LOWER\\((?:${column}|COALESCE\\(${column},\\s*''\\))\\)\\s+LIKE\\s+'%((?:''|[^'])*)%'`,
    'i',
  ).exec(sql);
  return match ? unquoteSqlString(match[1] ?? '') : undefined;
}

function getSqlStringListFilter(sql: string, column: string) {
  const match = new RegExp(`${column}\\s+IN\\s*\\(([^)]*)\\)`, 'i').exec(sql);
  if (!match?.[1]) return [];
  return Array.from(match[1].matchAll(/'((?:''|[^'])*)'/g), (value) =>
    unquoteSqlString(value[1] ?? ''),
  );
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

type VQueueMetaRowMock = {
  id: string;
  queue_is_paused: boolean;
  service_name: string;
  scope: string;
  limit_key: string;
  lock_name: string | null;
  last_enqueued_at: string;
  last_start_at: string;
  last_attempt_at: string;
  last_finish_at: string | null;
  avg_queue_duration: string;
  avg_inbox_duration: string;
  avg_run_duration: string;
  avg_suspension_duration: string | null;
  avg_end_to_end_duration: string;
  avg_blocked_on_concurrency_rules: string;
  avg_blocked_on_invoker_concurrency: string;
  avg_blocked_on_invoker_throttling: string;
  avg_blocked_on_lock: string;
  num_inbox: number;
  num_running: number;
  num_suspended: number;
  num_paused: number;
  num_finished: number;
};

const VQUEUE_SERVICES = [
  'CheckoutService',
  'PaymentWorkflow',
  'InventoryObject',
  'EmailService',
];
const VQUEUE_SCOPES = ['checkout', 'payments', 'inventory', 'notifications'];

function vqueueMetaRows(): VQueueMetaRowMock[] {
  return Array.from({ length: 64 }, (_, index) => {
    const active = index % 4 !== 0;
    const paused = index % 17 === 0;
    const inbox = active ? (index * 3) % 8 : 0;
    const serviceName = VQUEUE_SERVICES[index % VQUEUE_SERVICES.length] ?? '';
    const latestActivity = Date.now() - index * 37_000;
    const queueDuration = ((index % 12) + 1) / 10;
    const duration = (multiplier: number) =>
      `PT${Number((queueDuration * multiplier).toFixed(3))}S`;
    return {
      id: `vq_mock_${String(index + 1).padStart(3, '0')}`,
      queue_is_paused: paused,
      service_name: serviceName,
      scope: VQUEUE_SCOPES[index % VQUEUE_SCOPES.length] ?? '',
      limit_key: `tenant-${(index % 8) + 1}/priority-${(index % 3) + 1}`,
      lock_name:
        serviceName.endsWith('Object') || serviceName.endsWith('Workflow')
          ? `${serviceName}/${serviceName.endsWith('Object') ? 'item' : 'run'}-${(index % 12) + 1}`
          : null,
      last_enqueued_at: new Date(latestActivity - 8_000).toISOString(),
      last_start_at: new Date(latestActivity - 5_000).toISOString(),
      last_attempt_at: new Date(latestActivity - 2_000).toISOString(),
      last_finish_at:
        index % 3 === 0 ? new Date(latestActivity).toISOString() : null,
      avg_queue_duration: duration(1),
      avg_inbox_duration: duration(0.5),
      avg_run_duration: duration(2.5),
      avg_suspension_duration: index % 5 === 0 ? duration(4) : null,
      avg_end_to_end_duration: duration(3.5),
      avg_blocked_on_concurrency_rules: duration(index % 3 === 0 ? 0.8 : 0),
      avg_blocked_on_invoker_concurrency: duration(index % 7 === 0 ? 0.3 : 0),
      avg_blocked_on_invoker_throttling: duration(index % 11 === 0 ? 0.2 : 0),
      avg_blocked_on_lock: duration(
        serviceName.endsWith('Object') || serviceName.endsWith('Workflow')
          ? 0.15
          : 0,
      ),
      num_inbox: inbox,
      num_running: active && inbox === 0 ? 1 : 0,
      num_suspended: active && index % 9 === 0 ? 1 : 0,
      num_paused: paused ? 1 : 0,
      num_finished: (index * 7) % 41,
    };
  });
}

function vqueueSchedulerRows(ids: string[]) {
  const metaById = new Map(vqueueMetaRows().map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const meta = metaById.get(id);
    if (!meta) return [];
    const ordinal = Number(id.slice(-3));
    const mode = ordinal % 5;
    const status =
      mode === 1
        ? 'blocked'
        : mode === 2
          ? 'scheduled'
          : mode === 3
            ? 'ready'
            : mode === 4
              ? 'empty'
              : 'dormant';
    const isBlocked = status === 'blocked';
    const isLockBlocked = isBlocked && Boolean(meta.lock_name);
    const blockedDuration = `PT${((ordinal % 7) + 1) / 2}S`;
    const blockedResource = isBlocked
      ? isLockBlocked
        ? {
            resource: 'lock',
            scope: meta.scope,
            lock_name: meta.lock_name,
          }
        : {
            resource: 'limit-key-concurrency',
            scope: meta.scope,
            limit_key: meta.limit_key,
            blocked_level: 'level2',
            blocked_rule: `${meta.scope}/*/*`,
          }
      : undefined;
    return [
      {
        id,
        status,
        blocked_on: blockedResource?.resource ?? null,
        blocked_on_json: blockedResource
          ? JSON.stringify(blockedResource)
          : null,
        head_entry_id:
          status === 'empty' || status === 'dormant'
            ? null
            : `${ordinal % 6 === 0 ? 'mut' : 'inv'}_mock_${String(ordinal).padStart(3, '0')}`,
        scheduled_at:
          status === 'scheduled'
            ? new Date(Date.now() + ((ordinal % 6) + 1) * 5_000).toISOString()
            : null,
        invoker_concurrency_block_duration: 'PT0S',
        throttling_rules_block_duration: 'PT0S',
        invoker_throttling_block_duration: 'PT0S',
        invoker_memory_block_duration: 'PT0S',
        concurrency_rules_block_duration:
          isBlocked && !isLockBlocked ? blockedDuration : 'PT0S',
        lock_block_duration: isLockBlocked ? blockedDuration : 'PT0S',
        deployment_concurrency_block_duration: 'PT0S',
      },
    ];
  });
}

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
  const scope = getSqlLowerStringFilter(sql, 'scope');
  const scopeContains = getSqlLiteralContainsFilter(
    sql,
    "COALESCE\\(scope,\\s*''\\)",
  );
  const l1 = getSqlLowerStringFilter(sql, 'l1');
  const l2 = getSqlLowerStringFilter(sql, 'l2');
  const limitKeyContains = getSqlLiteralContainsFilter(
    sql,
    "CONCAT_WS\\('/',\\s*l1,\\s*l2\\)",
  );
  const requiresNullL1 = /\bl1\s+IS\s+NULL\b/i.test(sql);
  const requiresNullL2 = /\bl2\s+IS\s+NULL\b/i.test(sql);
  return userLimitRows(getSqlStringFilter(sql, 'rule_pattern')).filter(
    (row) => {
      const normalizedScope = row.scope?.toLocaleLowerCase() ?? '';
      const normalizedL1 = row.l1?.toLocaleLowerCase();
      const normalizedL2 = row.l2?.toLocaleLowerCase();
      const limitKey = [normalizedL1, normalizedL2].filter(Boolean).join('/');
      return (
        (scope === undefined || normalizedScope === scope) &&
        (scopeContains === undefined ||
          normalizedScope.includes(scopeContains)) &&
        (l1 === undefined || normalizedL1 === l1) &&
        (l2 === undefined || normalizedL2 === l2) &&
        (limitKeyContains === undefined ||
          limitKey.includes(limitKeyContains)) &&
        (!requiresNullL1 || row.l1 === null) &&
        (!requiresNullL2 || row.l2 === null)
      );
    },
  );
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

  if (/\bFROM\s+sys_scheduler\b/i.test(sql)) {
    return HttpResponse.json({
      rows: vqueueSchedulerRows(getSqlStringListFilter(sql, 'id')),
    } as any);
  }

  if (/\bFROM\s+sys_vqueue_meta\b/i.test(sql)) {
    const search = getSqlLikeFilter(sql, 'id');
    const rows = vqueueMetaRows().filter(
      (row) =>
        (!/\bqueue_is_paused\s*=\s*TRUE\b/i.test(sql) || row.queue_is_paused) &&
        (search === undefined ||
          [
            row.id,
            row.service_name,
            row.scope,
            row.limit_key,
            row.lock_name,
          ].some((value) => value?.toLocaleLowerCase().includes(search))),
    );
    return HttpResponse.json({ rows } as any);
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
