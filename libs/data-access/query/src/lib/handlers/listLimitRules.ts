import type { components } from '@restate/data-access/admin-api-spec';
import { quoteSqlString, type QueryContext } from './shared';
import { getUserLimitsRows } from './listUserLimits';

const LIMIT_RULE_COLUMNS = `pattern,
  concurrency,
  description,
  disabled,
  version,
  CAST(to_unixtime(last_modified) * 1000 AS BIGINT) AS last_modified_millis_since_epoch`;

type LimitRule = components['schemas']['RuleResponse'];
type LimitRuleStats = components['schemas']['LimitRuleStats'];
type LimitRuleWithStats = components['schemas']['LimitRuleWithStats'];
type LimitRuleRow = Omit<LimitRule, 'limits'> & {
  concurrency: LimitRule['limits']['concurrency'];
};
type LimitRuleStatsRow = LimitRuleStats & {
  rule_pattern: string;
};
type ListLimitRulesResponse = components['schemas']['ListLimitRulesResponse'];
type LimitRuleWithLimitsResponse =
  components['schemas']['LimitRuleWithLimitsResponse'];

function toLimitRule({ concurrency, ...rule }: LimitRuleRow): LimitRule {
  return {
    ...rule,
    limits: { concurrency },
  };
}

function toRuleStatsByPattern(rows: LimitRuleStatsRow[]) {
  return new Map(
    rows.map(({ rule_pattern, ...stats }) => [rule_pattern, stats]),
  );
}

async function getLimitRuleRow(
  context: QueryContext,
  pattern: string,
): Promise<LimitRule | undefined> {
  const { rows } = await context.query(`SELECT ${LIMIT_RULE_COLUMNS}
    FROM sys_rules
    WHERE pattern = ${quoteSqlString(pattern)}
    LIMIT 1`);

  const row = rows[0];
  return row ? toLimitRule(row as LimitRuleRow) : undefined;
}

type WorstCounter = NonNullable<LimitRuleStats['worst_counter']>;
type WorstCounterRow = WorstCounter & { rule_pattern: string };

async function getLimitRuleStatsRows(
  context: QueryContext,
): Promise<LimitRuleStatsRow[]> {
  // One GROUP BY for the per-rule numbers (pending / matches / backed up), plus
  // a window query for the deepest match per rule (highest num_waiters / limit
  // ratio). Attention is driven by pending invocations, not saturation.
  const [aggregate, worst] = await Promise.all([
    context.query(`SELECT rule_pattern,
      COALESCE(SUM(num_waiters), 0) AS pending,
      COUNT(*) AS matches,
      SUM(CASE WHEN num_waiters > 0 THEN 1 ELSE 0 END) AS backed_up
      FROM sys_user_limits
      WHERE rule_pattern IS NOT NULL
      GROUP BY rule_pattern`),
    context.query(`SELECT rule_pattern, scope, l1, l2, level, usage, concurrency_limit, num_waiters
      FROM (
        SELECT rule_pattern, scope, l1, l2, level, usage, concurrency_limit, num_waiters,
          ROW_NUMBER() OVER (
            PARTITION BY rule_pattern
            ORDER BY (CAST(num_waiters AS DOUBLE) / NULLIF(concurrency_limit, 0)) DESC, num_waiters DESC
          ) AS rn
        FROM sys_user_limits
        WHERE rule_pattern IS NOT NULL AND num_waiters > 0
      ) ranked
      WHERE rn = 1`),
  ]);

  const worstByPattern = new Map(
    (worst.rows as WorstCounterRow[]).map(({ rule_pattern, ...counter }) => [
      rule_pattern,
      counter,
    ]),
  );

  return (
    aggregate.rows as Array<Omit<LimitRuleStatsRow, 'worst_counter'>>
  ).map((row) => ({
    ...row,
    worst_counter: worstByPattern.get(row.rule_pattern) ?? null,
  }));
}

const EMPTY_RULE_STATS: LimitRuleStats = {
  pending: 0,
  matches: 0,
  backed_up: 0,
  worst_counter: null,
};

export async function listLimitRules(this: QueryContext, includeStats = false) {
  const { rows } = await this.query(`SELECT ${LIMIT_RULE_COLUMNS}
    FROM sys_rules
    ORDER BY pattern`);

  const rules = (rows as LimitRuleRow[]).map(toLimitRule);
  const statsByPattern = includeStats
    ? toRuleStatsByPattern(await getLimitRuleStatsRows(this))
    : undefined;

  const response: ListLimitRulesResponse = {
    rules: statsByPattern
      ? rules.map<LimitRuleWithStats>((rule) => ({
          ...rule,
          stats: statsByPattern.get(rule.pattern) ?? EMPTY_RULE_STATS,
        }))
      : rules,
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

export async function getLimitRuleWithLimits(
  this: QueryContext,
  pattern: string,
) {
  const [rule, limits] = await Promise.all([
    getLimitRuleRow(this, pattern),
    getUserLimitsRows(this, pattern),
  ]);

  if (!rule) {
    return new Response('Not found', { status: 404 });
  }

  const response: LimitRuleWithLimitsResponse = {
    rule,
    limits,
  };

  return Response.json(response);
}
