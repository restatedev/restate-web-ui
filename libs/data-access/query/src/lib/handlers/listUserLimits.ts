import type { components } from '@restate/data-access/admin-api-spec';
import { filtersToClause } from '../convertFilters';
import { limitPage, limitPageSize } from './limitPagination';
import { quoteSqlString, type QueryContext } from './shared';

const USER_LIMITS_COLUMNS =
  'scope, l1, l2, level, usage, concurrency_limit, rule_pattern, available, num_waiters';

type LimitCounterSort = components['schemas']['LimitCounterSort'];
type UserLimitRow = components['schemas']['UserLimitRow'];
type ListUserLimitsResponse = components['schemas']['ListUserLimitsResponse'];
type ListLimitCountersRequestBody =
  components['schemas']['ListLimitCountersRequestBody'];

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

async function counterPage(
  context: QueryContext,
  args: ListLimitCountersRequestBody,
  pattern?: string,
) {
  if (args.sort && !COUNTER_SORT_FIELDS.has(args.sort.field)) {
    return new Response('Unsupported sort field', { status: 400 });
  }
  const limit = limitPageSize(args.limit);
  const where = [
    pattern || args.rulePattern
      ? `rule_pattern = ${quoteSqlString(pattern ?? args.rulePattern ?? '')}`
      : '',
    !pattern && !args.rulePattern && !args.includeUnlimited
      ? 'rule_pattern IS NOT NULL'
      : '',
    filtersToClause(args.filters ?? []),
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
