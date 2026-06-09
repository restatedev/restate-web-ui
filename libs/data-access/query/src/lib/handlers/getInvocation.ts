import { ERROR_CODES, UI_ERROR_CODES } from '@restate/util/errors';
import { convertInvocation } from '../convertInvocation';
import { type QueryContext, getSysInvocationColumns } from './shared';

export async function getInvocation(this: QueryContext, invocationId: string) {
  // TODO(vqueue): overlay backing-off status from sys_vqueues here — fetch the
  // vqueue row for this invocation (fetchVqueueStatus) and pass it to
  // convertInvocation, as getInvocationJournalV2 does. Low priority: the
  // Restart/Resume dialogs use this for the target service, not the status.
  const invocations = await this.query(
    `SELECT ${getSysInvocationColumns(this.features).join(', ')} FROM sys_invocation WHERE id = '${invocationId}'`,
  ).then(({ rows }) => rows.map((row) => convertInvocation(row)));
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
