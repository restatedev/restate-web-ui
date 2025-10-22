import { convertInvocation } from '../convertInvocation';
import { queryFetcher } from './shared';

export async function getInvocation(
  invocationId: string,
  baseUrl: string,
  headers: Headers,
) {
  const invocations = await queryFetcher(
    `SELECT * FROM sys_invocation WHERE id = '${invocationId}'`,
    {
      baseUrl,
      headers,
    },
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
