import type { components } from '@restate/data-access/admin-api-spec';
import { limitPage, limitPageSize } from './limitPagination';
import { quoteSqlString, type QueryContext } from './shared';

const USER_LIMITS_COLUMNS =
  'scope, l1, l2, level, usage, concurrency_limit, rule_pattern, available, num_waiters';

type LimitCounterSort = components['schemas']['LimitCounterSort'];
type UserLimitRow = components['schemas']['UserLimitRow'];
type ListUserLimitsResponse = components['schemas']['ListUserLimitsResponse'];
type ListLimitCountersRequestBody =
  components['schemas']['ListLimitCountersRequestBody'];
type LimitCounterFilterItem = components['schemas']['LimitCounterFilterItem'];

const COUNTER_SORT_FIELDS = new Set<LimitCounterSort['field']>([
  'usage',
  'pattern',
  'waiting',
]);

const stringColumn = (column: string) => `COALESCE(${column}, '')`;
const numberColumn = (column: string) => `COALESCE(${column}, 0)`;
const unlimitedExpression = '(concurrency_limit IS NULL)';
const utilizationExpression =
  'COALESCE(CAST(usage AS DOUBLE) / concurrency_limit, 0)';
const limitKeyExpression = "CONCAT_WS('/', l1, l2)";

const STRING_OPERATIONS: Record<string, ReadonlySet<string>> = {
  scope: new Set(['EQUALS', 'CONTAINS']),
  limitKey: new Set(['EQUALS', 'CONTAINS']),
  l1: new Set(['EQUALS']),
  l2: new Set(['EQUALS']),
};

function counterOrderBy(sort?: LimitCounterSort) {
  const direction = sort?.order === 'ASC' ? 'ASC' : 'DESC';
  const field = sort?.field ?? 'waiting';
  const identity = `scope ASC, ${stringColumn('l1')} ASC, ${stringColumn('l2')} ASC`;
  const fieldOrder = (
    sortField: LimitCounterSort['field'],
    sortDirection: 'ASC' | 'DESC',
  ) => {
    if (sortField === 'usage') {
      return `${unlimitedExpression} ASC, ${utilizationExpression} ${sortDirection}`;
    }
    if (sortField === 'pattern') {
      return `${stringColumn('rule_pattern')} ${sortDirection}`;
    }
    return `${numberColumn('num_waiters')} ${sortDirection}`;
  };
  const order = [fieldOrder(field, direction)];
  if (field !== 'waiting') order.push(fieldOrder('waiting', 'DESC'));
  if (field !== 'usage') order.push(fieldOrder('usage', 'DESC'));
  if (field !== 'pattern') order.push(fieldOrder('pattern', 'ASC'));
  order.push(identity);
  return order.join(', ');
}

function searchClause(search?: string) {
  const value = search?.trim().toLocaleLowerCase();
  if (!value) return '';
  const parts = value.split('/').map((part) => part.trim());
  const columns = ['scope', 'l1', 'l2'];
  if (parts.length > 3) return 'FALSE';
  if (parts.length > 1) {
    return `(
    ${parts
      .map(
        (part, index) =>
          `LOWER(${stringColumn(columns[index] ?? 'l2')}) LIKE ${quoteSqlString(`%${part}%`)}`,
      )
      .join('\n    AND ')}
  )`;
  }
  const pattern = quoteSqlString(`%${parts[0]}%`);
  return `(
    LOWER(${stringColumn('scope')}) LIKE ${pattern}
    OR LOWER(${stringColumn('l1')}) LIKE ${pattern}
    OR LOWER(${stringColumn('l2')}) LIKE ${pattern}
  )`;
}

function filterError(filter: { field?: unknown }, reason: string): never {
  throw new Error(`Unsupported filter for ${String(filter.field)}: ${reason}`);
}

function filterStringValue(filter: LimitCounterFilterItem, value: unknown) {
  if (typeof value !== 'string' || value.length === 0) {
    return filterError(filter, 'expected a non-empty string value');
  }
  return value.toLowerCase();
}

function exactStringPredicate(column: string, value: string) {
  return `LOWER(${stringColumn(column)}) = ${quoteSqlString(value)}`;
}

function limitKeyPredicate(
  filter: LimitCounterFilterItem,
  operation: unknown,
  value: unknown,
) {
  const normalized = filterStringValue(filter, value);
  if (operation === 'CONTAINS') {
    return `strpos(LOWER(${limitKeyExpression}), ${quoteSqlString(normalized)}) > 0`;
  }
  const segments = normalized.split('/');
  if (
    operation !== 'EQUALS' ||
    segments.length > 2 ||
    segments.some((segment) => segment.length === 0)
  ) {
    return filterError(filter, 'expected one or two limit-key segments');
  }
  const [l1, l2] = segments;
  return l2
    ? `(${exactStringPredicate('l1', l1 ?? '')} AND ${exactStringPredicate('l2', l2)})`
    : `(${exactStringPredicate('l1', l1 ?? '')} AND l2 IS NULL)`;
}

function filterPredicate(filter: LimitCounterFilterItem) {
  const { operation, value } = filter as LimitCounterFilterItem & {
    operation?: unknown;
    value?: unknown;
  };
  if (filter.type !== 'STRING') {
    return filterError(filter, 'expected a STRING filter');
  }
  const supportedOperations = STRING_OPERATIONS[filter.field];
  if (!supportedOperations) {
    return filterError(filter, 'unsupported field');
  }
  if (!supportedOperations.has(String(operation))) {
    return filterError(
      filter,
      `unsupported STRING operation ${String(operation)}`,
    );
  }
  if (filter.field === 'limitKey') {
    return limitKeyPredicate(filter, operation, value);
  }
  const normalized = filterStringValue(filter, value);
  const column = `LOWER(${stringColumn(filter.field)})`;
  return operation === 'CONTAINS'
    ? `strpos(${column}, ${quoteSqlString(normalized)}) > 0`
    : `${column} = ${quoteSqlString(normalized)}`;
}

function counterFiltersClause(filters: unknown) {
  if (filters === undefined) return { clause: '' };
  if (!Array.isArray(filters)) {
    return { clause: '', error: 'Filters must be an array' };
  }
  try {
    return {
      clause: filters
        .map((filter) => filterPredicate(filter as LimitCounterFilterItem))
        .join(' AND '),
    };
  } catch (error) {
    return {
      clause: '',
      error: error instanceof Error ? error.message : 'Unsupported filter',
    };
  }
}

async function counterPage(
  context: QueryContext,
  args: ListLimitCountersRequestBody,
  pattern?: string,
) {
  if (args.sort && !COUNTER_SORT_FIELDS.has(args.sort.field)) {
    return new Response('Unsupported sort field', { status: 400 });
  }
  const filters = counterFiltersClause(args.filters);
  if (filters.error) {
    return new Response(filters.error, { status: 400 });
  }
  const limit = limitPageSize(args.limit);
  const where = [
    pattern || args.rulePattern
      ? `rule_pattern = ${quoteSqlString(pattern ?? args.rulePattern ?? '')}`
      : '',
    !pattern && !args.rulePattern && !args.includeUnlimited
      ? 'rule_pattern IS NOT NULL'
      : '',
    filters.clause,
    searchClause(args.search),
  ]
    .filter(Boolean)
    .join(' AND ');
  const whereClause = where ? `\n    WHERE ${where}` : '';
  const { rows } = await context.query(`SELECT ${USER_LIMITS_COLUMNS}
    FROM sys_user_limits${whereClause}
    ORDER BY ${counterOrderBy(args.sort)}
    LIMIT ${limit + 1}`);
  const page = limitPage(rows as UserLimitRow[], limit);
  const response: ListUserLimitsResponse = {
    limits: page.items,
    hasMore: page.hasMore,
  };
  return Response.json(response);
}

export async function listUserLimits(
  this: QueryContext,
  args: ListLimitCountersRequestBody = {},
) {
  return counterPage(this, args);
}

export async function listLimitCountersForRule(
  this: QueryContext,
  pattern: string,
  args: ListLimitCountersRequestBody = {},
) {
  return counterPage(this, args, pattern);
}
