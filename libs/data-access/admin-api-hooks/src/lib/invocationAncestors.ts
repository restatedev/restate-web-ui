import type { Invocation } from '@restate/data-access-admin-api-spec';
import { RestateError, UI_ERROR_CODES } from '@restate/util-errors';

export const MAX_INVOCATION_ANCESTORS = 10;

export function isInvocationNotFound(error: unknown) {
  return (
    error instanceof RestateError &&
    (error.restate_code === UI_ERROR_CODES.invocationNotFound ||
      error.status === 404)
  );
}

export async function walkInvocationAncestors(
  parentId: string,
  getInvocation: (id: string) => Promise<Invocation | undefined>,
  maxAncestors = MAX_INVOCATION_ANCESTORS,
) {
  const ancestors: Invocation[] = [];
  const seen = new Set<string>();
  let nextId: string | undefined = parentId;
  while (nextId && ancestors.length < maxAncestors && !seen.has(nextId)) {
    seen.add(nextId);
    const invocation = await getInvocation(nextId);
    if (!invocation) {
      break;
    }
    ancestors.push(invocation);
    nextId = invocation.invoked_by_id;
  }
  return ancestors;
}
