import { type QueryContext } from './shared';

export async function getPausedError(this: QueryContext, invocationId: string) {
  // TODO: Implement fetching paused error details for the invocation
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
