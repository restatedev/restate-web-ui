import type { components } from '@restate/data-access/admin-api-spec';
import { limitPage, limitPageSize } from './limitPagination';
import { quoteSqlString, type QueryContext } from './shared';
import {
  parseVqueueBlockedResource,
  parseVqueueSchedulingStatus,
} from './vqueueScheduler';

const VQUEUE_COLUMNS =
  'id, queue_is_paused, service_name, scope, limit_key, lock_name, last_enqueued_at, last_start_at, last_attempt_at, last_finish_at, avg_queue_duration, avg_inbox_duration, avg_run_duration, avg_suspension_duration, avg_end_to_end_duration, avg_blocked_on_concurrency_rules, avg_blocked_on_invoker_concurrency, avg_blocked_on_invoker_throttling, avg_blocked_on_lock, num_inbox, num_running, num_suspended, num_paused, num_finished';
const VQUEUE_LIST_LIMIT = 250;

type ListVQueuesRequestBody = components['schemas']['ListVQueuesRequestBody'];
type ListVQueuesResponse = components['schemas']['ListVQueuesResponse'];
type VQueueMetaRow = components['schemas']['VQueueMetaRow'];
type VQueueSchedulerState = components['schemas']['VQueueSchedulerState'];
type VQueueSort = components['schemas']['VQueueSort'];
type VQueueFilterItem = components['schemas']['VQueueFilterItem'];

interface SchedulerRow {
  id?: unknown;
  status?: unknown;
  blocked_on?: unknown;
  blocked_on_json?: unknown;
  head_entry_id?: unknown;
  scheduled_at?: unknown;
  invoker_concurrency_block_duration?: unknown;
  throttling_rules_block_duration?: unknown;
  invoker_throttling_block_duration?: unknown;
  invoker_memory_block_duration?: unknown;
  concurrency_rules_block_duration?: unknown;
  lock_block_duration?: unknown;
  deployment_concurrency_block_duration?: unknown;
}

const SORT_FIELDS = new Set<VQueueSort['field']>([
  'id',
  'service',
  'scope',
  'limitKey',
  'lockName',
  'inbox',
  'running',
  'suspended',
  'paused',
  'finished',
  'unfinished',
  'lastActivity',
]);
const SORT_ORDERS = new Set<VQueueSort['order']>(['ASC', 'DESC']);

const stringColumn = (column: string) => `COALESCE(${column}, '')`;
const numberColumn = (column: string) => `COALESCE(${column}, 0)`;
const unfinishedExpression = [
  'num_inbox',
  'num_running',
  'num_suspended',
  'num_paused',
]
  .map(numberColumn)
  .join(' + ');
const lastActivityExpression =
  'GREATEST(last_enqueued_at, last_start_at, last_attempt_at, last_finish_at)';

const STRING_FIELDS: Record<string, string> = {
  id: 'id',
  service: 'service_name',
  scope: 'scope',
  limitKey: 'limit_key',
  lockName: 'lock_name',
};

const STRING_OPERATIONS: Record<string, ReadonlySet<string>> = {
  id: new Set(['EQUALS']),
  service: new Set(['EQUALS']),
  scope: new Set(['EQUALS', 'CONTAINS']),
  limitKey: new Set(['EQUALS', 'CONTAINS']),
  l1: new Set(['EQUALS']),
  l2: new Set(['EQUALS']),
};

function sortExpression(field: VQueueSort['field']) {
  switch (field) {
    case 'id':
      return 'id';
    case 'service':
      return stringColumn('service_name');
    case 'scope':
      return stringColumn('scope');
    case 'limitKey':
      return stringColumn('limit_key');
    case 'lockName':
      return stringColumn('lock_name');
    case 'inbox':
      return numberColumn('num_inbox');
    case 'running':
      return numberColumn('num_running');
    case 'suspended':
      return numberColumn('num_suspended');
    case 'paused':
      return numberColumn('num_paused');
    case 'finished':
      return numberColumn('num_finished');
    case 'unfinished':
      return `(${unfinishedExpression})`;
    case 'lastActivity':
      return lastActivityExpression;
  }
}

function orderBy(sort: VQueueSort) {
  const field = sort.field;
  const direction = sort.order;
  const order = [
    `${sortExpression(field)} ${direction}${
      field === 'lastActivity' ? ' NULLS LAST' : ''
    }`,
  ];
  if (field === 'scope') {
    order.push(`${stringColumn('limit_key')} ${direction}`);
  }
  if (field !== 'unfinished') order.push(`(${unfinishedExpression}) DESC`);
  if (field !== 'lastActivity') {
    order.push(`${lastActivityExpression} DESC NULLS LAST`);
  }
  if (field !== 'service') order.push(`${stringColumn('service_name')} ASC`);
  if (field !== 'id') order.push('id ASC');
  return order.join(', ');
}

function filterError(filter: VQueueFilterItem, reason: string): never {
  throw new Error(`Unsupported filter for ${filter.field}: ${reason}`);
}

function stringValue(filter: VQueueFilterItem, value: unknown) {
  if (typeof value !== 'string') filterError(filter, 'expected a string value');
  return value.toLowerCase();
}

function stringPredicate(
  filter: VQueueFilterItem,
  expression: string,
  operation: unknown,
  value: unknown,
) {
  const supportedOperations = STRING_OPERATIONS[filter.field];
  if (supportedOperations && !supportedOperations.has(String(operation))) {
    return filterError(
      filter,
      `unsupported STRING operation ${String(operation)}`,
    );
  }
  if (operation === 'IS NULL') return `${expression} IS NULL`;
  if (operation === 'IS NOT NULL') return `${expression} IS NOT NULL`;
  const normalized = stringValue(filter, value);
  const column = `LOWER(${stringColumn(expression)})`;
  switch (operation) {
    case 'EQUALS':
      return `${column} = ${quoteSqlString(normalized)}`;
    case 'NOT_EQUALS':
      return `${column} <> ${quoteSqlString(normalized)}`;
    case 'CONTAINS':
      return `strpos(${column}, ${quoteSqlString(normalized)}) > 0`;
    case 'NOT_CONTAINS':
      return `strpos(${column}, ${quoteSqlString(normalized)}) = 0`;
    default:
      return filterError(filter, `unsupported STRING operation ${operation}`);
  }
}

function limitKeySegmentPredicate(
  filter: VQueueFilterItem,
  operation: unknown,
  value: unknown,
) {
  if (operation !== 'EQUALS') {
    return filterError(
      filter,
      `unsupported STRING operation ${String(operation)}`,
    );
  }
  const normalized = stringValue(filter, value);
  if (!normalized || normalized.includes('/')) {
    return filterError(filter, 'expected one limit-key segment');
  }
  const column = `LOWER(${stringColumn('limit_key')})`;
  if (filter.field === 'l1') {
    return `(${column} = ${quoteSqlString(normalized)} OR starts_with(${column}, ${quoteSqlString(`${normalized}/`)}))`;
  }
  return `ends_with(${column}, ${quoteSqlString(`/${normalized}`)})`;
}

function stringListPredicate(
  filter: VQueueFilterItem,
  operation: unknown,
  value: unknown,
) {
  const expression = STRING_FIELDS[filter.field];
  if (!expression) filterError(filter, 'unsupported STRING_LIST field');
  if (operation !== 'IN' && operation !== 'NOT_IN') {
    filterError(filter, `unsupported STRING_LIST operation ${operation}`);
  }
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== 'string')
  ) {
    filterError(filter, 'expected a non-empty string array');
  }
  const values = value
    .map((item) => quoteSqlString(item.toLowerCase()))
    .join(', ');
  return `LOWER(${stringColumn(expression)}) ${operation === 'IN' ? 'IN' : 'NOT IN'} (${values})`;
}

function nullPredicate(filter: VQueueFilterItem, operation: unknown) {
  const expression = STRING_FIELDS[filter.field];
  if (!expression) filterError(filter, 'unsupported NULL field');
  if (operation !== 'IS' && operation !== 'IS_NOT') {
    filterError(filter, `unsupported NULL operation ${operation}`);
  }
  return `${expression} IS${operation === 'IS_NOT' ? ' NOT' : ''} NULL`;
}

function filterPredicate(filter: VQueueFilterItem) {
  const { operation, value } = filter as VQueueFilterItem & {
    operation?: unknown;
    value?: unknown;
  };
  if (filter.field !== 'lockName' && filter.type !== 'STRING') {
    return filterError(filter, 'expected a STRING filter');
  }
  switch (filter.type) {
    case 'STRING': {
      if (filter.field === 'l1' || filter.field === 'l2') {
        return limitKeySegmentPredicate(filter, operation, value);
      }
      const expression = STRING_FIELDS[filter.field];
      if (!expression) filterError(filter, 'unsupported STRING field');
      return stringPredicate(filter, expression, operation, value);
    }
    case 'STRING_LIST':
      return stringListPredicate(filter, operation, value);
    case 'NULL':
      return nullPredicate(filter, operation);
    default:
      throw new Error('Unsupported filter type');
  }
}

function whereClause(filters: unknown) {
  if (filters === undefined) return { clause: '' };
  if (!Array.isArray(filters)) {
    return { clause: '', error: 'Filters must be an array' };
  }
  if (!filters.length) return { clause: '' };
  try {
    const predicates = filters.map((filter) =>
      filterPredicate(filter as VQueueFilterItem),
    );
    return { clause: `\n    WHERE ${predicates.join(' AND ')}` };
  } catch (error) {
    return {
      clause: '',
      error: error instanceof Error ? error.message : 'Unsupported filter',
    };
  }
}

function schedulerQuery(vqueueIds: string[]) {
  return `SELECT
  id,
  status,
  blocked_on,
  blocked_on_json,
  head_entry_id,
  scheduled_at,
  invoker_concurrency_block_duration,
  throttling_rules_block_duration,
  invoker_throttling_block_duration,
  invoker_memory_block_duration,
  concurrency_rules_block_duration,
  lock_block_duration,
  deployment_concurrency_block_duration
FROM sys_scheduler
WHERE id IN (${vqueueIds.map(quoteSqlString).join(', ')})`;
}

function optionalString(value: unknown) {
  return value === null || value === undefined || value === ''
    ? undefined
    : String(value);
}

const BLOCK_DURATION_FIELDS: Record<string, keyof SchedulerRow> = {
  lock: 'lock_block_duration',
  'invoker-concurrency': 'invoker_concurrency_block_duration',
  invoker_concurrency: 'invoker_concurrency_block_duration',
  'invoker-throttling': 'invoker_throttling_block_duration',
  invoker_throttling: 'invoker_throttling_block_duration',
  'invoker-memory': 'invoker_memory_block_duration',
  invoker_memory: 'invoker_memory_block_duration',
  'deployment-concurrency': 'deployment_concurrency_block_duration',
  deployment_concurrency: 'deployment_concurrency_block_duration',
  'limit-key-concurrency': 'concurrency_rules_block_duration',
  concurrency_rules: 'concurrency_rules_block_duration',
  throttling_rules: 'throttling_rules_block_duration',
};

function schedulerState(row: SchedulerRow): VQueueSchedulerState | undefined {
  const status = parseVqueueSchedulingStatus(optionalString(row.status));
  if (!status) return undefined;
  const headEntryId = optionalString(row.head_entry_id);
  const scheduledAt = optionalString(row.scheduled_at);
  const blockedOn = optionalString(row.blocked_on);
  const blockedResource = parseVqueueBlockedResource(row.blocked_on_json);
  const durationField =
    BLOCK_DURATION_FIELDS[blockedResource?.resource ?? ''] ??
    BLOCK_DURATION_FIELDS[blockedOn ?? ''];
  const blockedDuration = durationField
    ? optionalString(row[durationField])
    : undefined;
  return {
    status,
    ...(headEntryId && { headEntryId }),
    ...(scheduledAt && { scheduledAt }),
    ...(blockedOn && { blockedOn }),
    ...(blockedResource && { blockedResource }),
    ...(blockedDuration && { blockedDuration }),
  };
}

export async function listVqueues(
  this: QueryContext,
  args: ListVQueuesRequestBody = {},
) {
  if (args.sort && !SORT_FIELDS.has(args.sort.field)) {
    return new Response('Unsupported sort field', { status: 400 });
  }
  if (args.sort && !SORT_ORDERS.has(args.sort.order)) {
    return new Response('Unsupported sort order', { status: 400 });
  }
  const filters = whereClause(args.filters);
  if (filters.error) {
    return new Response(filters.error, { status: 400 });
  }
  const limit = Math.min(limitPageSize(args.limit), VQUEUE_LIST_LIMIT);
  const order = args.sort ? `\n    ORDER BY ${orderBy(args.sort)}` : '';
  const { rows } = await this.query(`SELECT ${VQUEUE_COLUMNS}
    FROM sys_vqueue_meta${filters.clause}${order}
    LIMIT ${limit + 1}`);
  const page = limitPage(rows as VQueueMetaRow[], limit);
  if (page.items.length === 0) {
    const response: ListVQueuesResponse = {
      vqueues: [],
      hasMore: page.hasMore,
    };
    return Response.json(response);
  }
  const schedulerRows = await this.query(
    schedulerQuery(page.items.map((row) => row.id)),
  );
  const schedulerById = new Map(
    (schedulerRows.rows as SchedulerRow[]).flatMap((row) => {
      const id = optionalString(row.id);
      const scheduler = schedulerState(row);
      return id && scheduler ? [[id, scheduler] as const] : [];
    }),
  );
  const response: ListVQueuesResponse = {
    vqueues: page.items.map((row) => {
      const scheduler = schedulerById.get(row.id);
      return scheduler ? { ...row, scheduler } : row;
    }),
    hasMore: page.hasMore,
  };
  return Response.json(response);
}
