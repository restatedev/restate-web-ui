import type {
  components,
  FilterItem,
} from '@restate/data-access/admin-api-spec';
import { filtersToClause } from '../convertFilters';
import {
  decodeLimitCursor,
  keysetOrderBy,
  keysetWhere,
  limitPage,
  limitPageSize,
  type KeysetColumn,
} from './limitPagination';
import { quoteSqlString, type QueryContext } from './shared';

const USER_LIMITS_COLUMNS =
  'scope, l1, l2, level, usage, concurrency_limit, rule_pattern, available, num_waiters';

type LimitCounterSort = components['schemas']['LimitCounterSort'];
type UserLimitRow = components['schemas']['UserLimitRow'];
type ListUserLimitsResponse = components['schemas']['ListUserLimitsResponse'];
type ListLimitCountersRequestBody =
  components['schemas']['ListLimitCountersRequestBody'];
type LimitCounterIdentity = components['schemas']['LimitCounterIdentity'];

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

function identityColumns(): KeysetColumn<UserLimitRow>[] {
  return [
    {
      expression: 'scope',
      direction: 'ASC',
      value: (row) => row.scope ?? '',
    },
    {
      expression: stringColumn('l1'),
      direction: 'ASC',
      value: (row) => row.l1 ?? '',
    },
    {
      expression: stringColumn('l2'),
      direction: 'ASC',
      value: (row) => row.l2 ?? '',
    },
  ];
}

function counterSortColumns(
  sort?: LimitCounterSort,
): KeysetColumn<UserLimitRow>[] {
  const direction = sort?.order === 'ASC' ? 'ASC' : 'DESC';
  const field = sort?.field ?? 'waiting';
  const identity = identityColumns();

  if (field === 'usage') {
    return [
      {
        expression: unlimitedExpression,
        direction: 'ASC',
        value: (row) => row.concurrency_limit == null,
      },
      {
        expression: utilizationExpression,
        direction,
        value: (row) => {
          if (row.concurrency_limit == null) return 0;
          return (row.usage ?? 0) / row.concurrency_limit;
        },
      },
      ...identity,
    ];
  }
  if (field === 'pattern') {
    return [
      {
        expression: stringColumn('rule_pattern'),
        direction,
        value: (row) => row.rule_pattern ?? '',
      },
      ...identity,
    ];
  }

  return [
    {
      expression: numberColumn('num_waiters'),
      direction,
      value: (row) => row.num_waiters ?? 0,
    },
    ...identity,
  ];
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

function identityClause({ scope, l1, l2 }: LimitCounterIdentity) {
  return [
    `scope = ${quoteSqlString(scope)}`,
    l1 === undefined ? 'l1 IS NULL' : `l1 = ${quoteSqlString(l1)}`,
    l2 === undefined ? 'l2 IS NULL' : `l2 = ${quoteSqlString(l2)}`,
  ].join(' AND ');
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
  const columns = counterSortColumns(args.sort);
  const signature = JSON.stringify({
    type: pattern ? 'rule-counters' : 'counters',
    pattern,
    rulePattern: args.rulePattern,
    includeUnlimited: args.includeUnlimited ?? false,
    filters: args.filters ?? [],
    search: args.search?.trim() ?? '',
    sort: args.sort ?? { field: 'waiting', order: 'DESC' },
  });
  const cursor = decodeLimitCursor(args.after, signature, columns.length);
  if (cursor === null) {
    return new Response('Invalid cursor', { status: 400 });
  }
  const where = [
    pattern || args.rulePattern
      ? `rule_pattern = ${quoteSqlString(pattern ?? args.rulePattern ?? '')}`
      : '',
    !pattern && !args.rulePattern && !args.includeUnlimited
      ? 'rule_pattern IS NOT NULL'
      : '',
    filtersToClause(args.filters ?? []),
    searchClause(args.search),
    cursor ? keysetWhere(columns, cursor) : '',
  ]
    .filter(Boolean)
    .join(' AND ');
  const whereClause = where ? `\n    WHERE ${where}` : '';
  const { rows } = await context.query(`SELECT ${USER_LIMITS_COLUMNS}
    FROM sys_user_limits${whereClause}
    ORDER BY ${keysetOrderBy(columns)}
    LIMIT ${limit + 1}`);
  const page = limitPage(rows as UserLimitRow[], limit, signature, columns);
  const response: ListUserLimitsResponse = {
    limits: page.items,
    hasMore: page.hasMore,
    ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
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

export async function getUserLimit(
  this: QueryContext,
  identity: LimitCounterIdentity,
) {
  const { rows } = await this.query(`SELECT ${USER_LIMITS_COLUMNS}
    FROM sys_user_limits
    WHERE ${identityClause(identity)}
    LIMIT 1`);
  const counter = rows[0];
  return counter
    ? Response.json(counter as UserLimitRow)
    : new Response('Not found', { status: 404 });
}
