import type {
  FilterItem,
  components,
} from '@restate/data-access/admin-api-spec';
import { limitPage, limitPageSize } from './limitPagination';
import { quoteSqlString, type QueryContext } from './shared';

const VQUEUE_COLUMNS =
  'id, queue_is_paused, service_name, scope, limit_key, lock_name, last_enqueued_at, last_start_at, last_attempt_at, last_finish_at, avg_queue_duration, avg_inbox_duration, avg_run_duration, avg_suspension_duration, avg_end_to_end_duration, avg_blocked_on_concurrency_rules, avg_blocked_on_invoker_concurrency, avg_blocked_on_invoker_throttling, avg_blocked_on_lock, num_inbox, num_running, num_suspended, num_paused, num_finished';

type ListVQueuesRequestBody = components['schemas']['ListVQueuesRequestBody'];
type ListVQueuesResponse = components['schemas']['ListVQueuesResponse'];
type VQueueMetaRow = components['schemas']['VQueueMetaRow'];
type VQueueSort = components['schemas']['VQueueSort'];

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

function orderBy(sort?: VQueueSort) {
  const field = sort?.field ?? 'lastActivity';
  const direction = sort?.order ?? 'DESC';
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

function filterError(filter: FilterItem, reason: string): never {
  throw new Error(`Unsupported filter for ${filter.field}: ${reason}`);
}

function stringValue(filter: FilterItem, value: unknown) {
  if (typeof value !== 'string') filterError(filter, 'expected a string value');
  return value.toLowerCase();
}

function stringPredicate(
  filter: FilterItem,
  expression: string,
  operation: unknown,
  value: unknown,
) {
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
      return `${column} LIKE ${quoteSqlString(`%${normalized}%`)}`;
    case 'NOT_CONTAINS':
      return `${column} NOT LIKE ${quoteSqlString(`%${normalized}%`)}`;
    default:
      return filterError(filter, `unsupported STRING operation ${operation}`);
  }
}

function stringListPredicate(
  filter: FilterItem,
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

function nullPredicate(filter: FilterItem, operation: unknown) {
  const expression = STRING_FIELDS[filter.field];
  if (!expression) filterError(filter, 'unsupported NULL field');
  if (operation !== 'IS' && operation !== 'IS_NOT') {
    filterError(filter, `unsupported NULL operation ${operation}`);
  }
  return `${expression} IS${operation === 'IS_NOT' ? ' NOT' : ''} NULL`;
}

function filterPredicate(filter: FilterItem) {
  const { operation, value } = filter as FilterItem & {
    operation?: unknown;
    value?: unknown;
  };
  switch (filter.type) {
    case 'STRING': {
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
      filterPredicate(filter as FilterItem),
    );
    return { clause: `\n    WHERE ${predicates.join(' AND ')}` };
  } catch (error) {
    return {
      clause: '',
      error: error instanceof Error ? error.message : 'Unsupported filter',
    };
  }
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
  const limit = limitPageSize(args.limit);
  const { rows } = await this.query(`SELECT ${VQUEUE_COLUMNS}
    FROM sys_vqueue_meta${filters.clause}
    ORDER BY ${orderBy(args.sort)}
    LIMIT ${limit + 1}`);
  const page = limitPage(rows as VQueueMetaRow[], limit);
  const response: ListVQueuesResponse = {
    vqueues: page.items,
    hasMore: page.hasMore,
  };
  return Response.json(response);
}
