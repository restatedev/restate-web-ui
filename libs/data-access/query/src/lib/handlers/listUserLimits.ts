import type {
  components,
  FilterItem,
} from '@restate/data-access/admin-api-spec';
import { quoteSqlString, type QueryContext } from './shared';
import { filtersToClause } from '../convertFilters';

const USER_LIMITS_COLUMNS =
  'scope, l1, l2, level, usage, concurrency_limit, rule_pattern, available, num_waiters';

const COUNTERS_LIMIT = 100;

// Columns the counters table is allowed to sort by (guards the ORDER BY against
// arbitrary field names coming from the URL). All map to real sys_user_limits
// columns, so the field doubles as the SQL expression.
const COUNTER_SORT_FIELDS = new Set([
  'num_waiters',
  'usage',
  'available',
  'scope',
  'l1',
  'l2',
  'level',
  'concurrency_limit',
]);

type LimitSort = components['schemas']['LimitSort'];
type UserLimitRow = components['schemas']['UserLimitRow'];
type ListUserLimitsResponse = components['schemas']['ListUserLimitsResponse'];

function buildCounterOrderBy(sort?: LimitSort): string {
  if (sort && COUNTER_SORT_FIELDS.has(sort.field)) {
    const dir = sort.order === 'ASC' ? 'ASC' : 'DESC';
    return `ORDER BY ${sort.field} ${dir} NULLS LAST, scope, l1, l2, level`;
  }
  return 'ORDER BY scope, l1, l2, level, rule_pattern';
}

export async function getUserLimitsRows(
  context: QueryContext,
  rulePattern?: string,
): Promise<UserLimitRow[]> {
  const where = rulePattern
    ? `WHERE rule_pattern = ${quoteSqlString(rulePattern)}`
    : '';
  const { rows } = await context.query(`SELECT ${USER_LIMITS_COLUMNS}
    FROM sys_user_limits
    ${where}
    ORDER BY scope, l1, l2, level, rule_pattern`);

  return rows as UserLimitRow[];
}

export async function listUserLimits(this: QueryContext) {
  const response: ListUserLimitsResponse = {
    limits: await getUserLimitsRows(this),
  };

  return Response.json(response);
}

export async function getUserLimitsForRule(
  this: QueryContext,
  pattern: string,
) {
  const response: ListUserLimitsResponse = {
    limits: await getUserLimitsRows(this, pattern),
  };

  return Response.json(response);
}

// The detail page's "Active matches" tab: counters resolving to one rule, with
// server-side filtering + sorting fed from the query bar, capped at 100 rows.
export async function getLimitCountersRows(
  context: QueryContext,
  pattern: string,
  { filters = [], sort }: { filters?: FilterItem[]; sort?: LimitSort },
): Promise<UserLimitRow[]> {
  const where = [
    `rule_pattern = ${quoteSqlString(pattern)}`,
    filtersToClause(filters),
  ]
    .filter(Boolean)
    .join(' AND ');
  const { rows } = await context.query(`SELECT ${USER_LIMITS_COLUMNS}
    FROM sys_user_limits
    WHERE ${where}
    ${buildCounterOrderBy(sort)}
    LIMIT ${COUNTERS_LIMIT}`);

  return rows as UserLimitRow[];
}

export async function listLimitCountersForRule(
  this: QueryContext,
  pattern: string,
  filters: FilterItem[] = [],
  sort?: LimitSort,
) {
  const response: ListUserLimitsResponse = {
    limits: await getLimitCountersRows(this, pattern, { filters, sort }),
  };

  return Response.json(response);
}
