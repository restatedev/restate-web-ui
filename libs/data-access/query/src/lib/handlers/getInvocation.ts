import { ERROR_CODES, UI_ERROR_CODES } from '@restate/util/errors';
import { convertInvocation } from '../convertInvocation';
import { type QueryContext, sysInvocationColumns } from './shared';

export async function getInvocation(this: QueryContext, invocationId: string) {
  const invocations = await this.query(
    `SELECT ${sysInvocationColumns(this.features).join(', ')} FROM sys_invocation WHERE id = '${invocationId}'`,
  ).then(({ rows }) => rows.map(convertInvocation));
  if (invocations.length > 0) {
    return new Response(JSON.stringify(invocations.at(0)), {
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
