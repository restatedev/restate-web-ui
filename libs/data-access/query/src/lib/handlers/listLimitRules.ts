import type { components } from '@restate/data-access/admin-api-spec';
import { limitPage, limitPageSize } from './limitPagination';
import { quoteSqlString, type QueryContext } from './shared';

const LIMIT_RULE_LIST_COLUMNS = `pattern,
  concurrency,
  description,
  disabled,
  version`;

const LIMIT_RULE_COLUMNS = `${LIMIT_RULE_LIST_COLUMNS},
  last_modified`;

type LimitRule = components['schemas']['RuleResponse'];
type LimitRuleRow = Omit<
  LimitRule,
  'limits' | 'last_modified_millis_since_epoch'
> & {
  concurrency: LimitRule['limits']['concurrency'];
  last_modified: string;
};
type LimitRuleWithStats = components['schemas']['LimitRuleWithStats'];
type LimitRuleListRow = Pick<
  LimitRuleWithStats,
  'pattern' | 'description' | 'disabled' | 'version'
> & {
  concurrency: LimitRuleWithStats['limits']['concurrency'];
};
type LimitRuleCounterStatsRow = Pick<
  LimitRuleWithStats,
  'num_counters' | 'num_counters_with_waiters'
> & {
  rule_pattern: string;
};
type ListLimitRulesResponse = components['schemas']['ListLimitRulesResponse'];
type ListLimitRulesRequestBody =
  components['schemas']['ListLimitRulesRequestBody'];

function toLimitRule({
  concurrency,
  last_modified,
  ...rule
}: LimitRuleRow): LimitRule {
  return {
    ...rule,
    last_modified_millis_since_epoch: Date.parse(last_modified),
    limits: { concurrency },
  };
}

function toLimitRuleWithStats(
  { pattern, concurrency, description, disabled, version }: LimitRuleListRow,
  stats?: LimitRuleCounterStatsRow,
): LimitRuleWithStats {
  return {
    pattern,
    description,
    disabled,
    version,
    num_counters: stats?.num_counters ?? 0,
    num_counters_with_waiters: stats?.num_counters_with_waiters ?? 0,
    limits: { concurrency },
  };
}

function ruleSortDirection(sort?: components['schemas']['LimitRuleSort']) {
  return sort?.field === 'pattern' && sort.order === 'DESC' ? 'DESC' : 'ASC';
}

async function getLimitRuleRow(
  context: QueryContext,
  pattern: string,
): Promise<LimitRule | undefined> {
  const { rows } = await context.query(
    `SELECT ${LIMIT_RULE_COLUMNS}
    FROM sys_rules
    WHERE pattern = ${quoteSqlString(pattern)}`,
    'limits/rule',
  );

  const row = rows[0];
  return row ? toLimitRule(row as LimitRuleRow) : undefined;
}

export async function listLimitRules(
  this: QueryContext,
  args: ListLimitRulesRequestBody = {},
) {
  const limit = limitPageSize(args.limit);
  const patternFilter = args.rulePattern
    ? `\n    WHERE pattern = ${quoteSqlString(args.rulePattern)}`
    : '';
  const { rows } = await this.query(
    `SELECT ${LIMIT_RULE_LIST_COLUMNS}
    FROM sys_rules${patternFilter}
    ORDER BY pattern ${ruleSortDirection(args.sort)}
    LIMIT ${limit + 1}`,
    'limits/rules-page',
  );
  const page = limitPage(rows as LimitRuleListRow[], limit);
  const patterns = page.items.map((rule) => rule.pattern);
  const countersResult =
    patterns.length === 0
      ? { rows: [] }
      : await this.query(
          `SELECT rule_pattern,
      COUNT(*) AS num_counters,
      SUM(CASE WHEN num_waiters > 0 THEN 1 ELSE 0 END) AS num_counters_with_waiters
    FROM sys_user_limits
    WHERE rule_pattern IN (${patterns.map(quoteSqlString).join(', ')})
    GROUP BY rule_pattern`,
          'limits/rules-counter-stats',
        );
  const countersByPattern = new Map(
    (countersResult.rows as LimitRuleCounterStatsRow[]).map((stats) => [
      stats.rule_pattern,
      stats,
    ]),
  );
  const response: ListLimitRulesResponse = {
    rules: page.items.map((rule) =>
      toLimitRuleWithStats(rule, countersByPattern.get(rule.pattern)),
    ),
    hasMore: page.hasMore,
  };

  return Response.json(response);
}

export async function getLimitRule(this: QueryContext, pattern: string) {
  const rule = await getLimitRuleRow(this, pattern);
  if (!rule) {
    return new Response('Not found', { status: 404 });
  }

  return Response.json(rule);
}
