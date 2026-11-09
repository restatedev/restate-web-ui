import type { InvocationToolKind } from '@restate/util-openapi';

export type InvocationLookup = 'byId' | 'byTarget';

export function toolId(kind: InvocationToolKind) {
  return `@tool:${kind}`;
}

export function operationKey(id: string) {
  return `@operation:${id}`;
}

export function toolDraftName(
  kind: InvocationToolKind,
  lookup: InvocationLookup,
) {
  return `${toolId(kind)}:${lookup}`;
}
