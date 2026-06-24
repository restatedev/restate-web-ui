import type { components } from '@restate/data-access/admin-api-spec';
import { quoteSqlString, type QueryContext } from './shared';

const USER_LIMITS_COLUMNS =
  'scope, l1, l2, level, usage, concurrency_limit, rule_pattern, available, num_waiters';

type UserLimitRow = components['schemas']['UserLimitRow'];
type ListUserLimitsResponse = components['schemas']['ListUserLimitsResponse'];

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
