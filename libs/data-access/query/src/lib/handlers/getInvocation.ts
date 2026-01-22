import { convertInvocation } from '../convertInvocation';
import { type QueryContext, SYS_INVOCATION_COLUMNS } from './shared';

export async function getInvocation(this: QueryContext, invocationId: string) {
  const invocations = await this.query(
    `SELECT ${SYS_INVOCATION_COLUMNS.join(', ')} FROM sys_invocation WHERE id = '${invocationId}'`,
  ).then(({ rows }) => rows.map(convertInvocation));
  if (invocations.length > 0) {
    return new Response(JSON.stringify(invocations.at(0)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      message:
        'Invocation not found or no longer available.\n\nThe requested invocation either does not exist or has already completed and has been removed after its retention period expired. Completed invocations are only retained if a journal retention period is explicitly set, if they are part of a workflow, or if they were invoked with an idempotency key. In all cases, they are retained only for the duration of the specified retention period.',
    }),
    {
      status: 404,
      statusText: 'Not found',
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
