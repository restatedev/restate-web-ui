import { ERROR_CODES, UI_ERROR_CODES } from '@restate/util/errors';
import { convertInvocation } from '../convertInvocation';
import {
  type QueryContext,
  getSysInvocationColumns,
  quoteSqlString,
} from './shared';
import { fetchVqueueStatuses } from './vqueue';

export async function getInvocation(this: QueryContext, invocationId: string) {
  const [invocationRows, vqueueStatuses] = await Promise.all([
    this.query(
      `SELECT ${getSysInvocationColumns(this.features).join(', ')} FROM sys_invocation WHERE id = ${quoteSqlString(invocationId)}`,
    ),
    fetchVqueueStatuses(this, [invocationId]),
  ]);
  const rawInvocation = invocationRows.rows.at(0);
  const invocation = rawInvocation
    ? convertInvocation(rawInvocation, vqueueStatuses.get(invocationId))
    : undefined;
  if (invocation) {
    return new Response(JSON.stringify(invocation), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      message: ERROR_CODES[UI_ERROR_CODES.invocationNotFound]?.help,
      restate_code: UI_ERROR_CODES.invocationNotFound,
    }),
    {
      status: 404,
      statusText: 'Not found',
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
