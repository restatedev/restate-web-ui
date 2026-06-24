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
type LimitRuleRow = Omit<LimitRule, 'limits'> & {
  concurrency: LimitRule['limits']['concurrency'];
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

export async function listLimitRules(this: QueryContext) {
  const { rows } = await this.query(`SELECT ${LIMIT_RULE_COLUMNS}
    FROM sys_rules
    ORDER BY pattern`);

  const response: ListLimitRulesResponse = {
    rules: (rows as LimitRuleRow[]).map(toLimitRule),
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
