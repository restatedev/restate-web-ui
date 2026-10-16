import type { components } from '@restate/data-access/admin-api-spec';
import { limitPage, limitPageSize } from './limitPagination';
import { quoteSqlString, type QueryContext } from './shared';

const LIMIT_RULE_LIST_COLUMNS = `pattern,
  concurrency,
  description,
  disabled,
  version`;

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
