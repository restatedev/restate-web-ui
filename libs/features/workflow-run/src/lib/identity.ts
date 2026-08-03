export const WORKFLOWS_PATH = '/workflows';
export const WORKFLOW_SCOPE_QUERY_PARAM = 'scope';

export interface WorkflowRunIdentity {
  service: string;
  id: string;
  scope?: string;
}

export function workflowRunHref(
  baseUrl: string,
  { service, id, scope }: WorkflowRunIdentity,
): string {
  const pathname = `${baseUrl}${WORKFLOWS_PATH}/${encodeURIComponent(service)}/${encodeURIComponent(id)}`;
  if (scope === undefined) return pathname;
  const searchParams = new URLSearchParams();
  searchParams.set(WORKFLOW_SCOPE_QUERY_PARAM, scope);
  return `${pathname}?${searchParams}`;
}

export function workflowScopeFromSearch(
  search: string | URLSearchParams,
): string | undefined {
  const searchParams =
    typeof search === 'string'
      ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
      : search;
  return searchParams.has(WORKFLOW_SCOPE_QUERY_PARAM)
    ? String(searchParams.get(WORKFLOW_SCOPE_QUERY_PARAM))
    : undefined;
}

export function formatWorkflowRunIdentity({
  service,
  id,
  scope,
}: WorkflowRunIdentity): string {
  return scope ? `Scope ${scope} · ${service} / ${id}` : `${service} / ${id}`;
}
