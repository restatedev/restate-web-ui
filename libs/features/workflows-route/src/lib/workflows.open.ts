import type { WorkflowRunIdentity } from '@restate/features/workflow-run';

export interface WorkflowOpenDraft {
  id: string;
  scope: string;
}

export function workflowIdentityFromOpenDraft(
  service: string,
  draft: WorkflowOpenDraft,
  hasScope: boolean,
): WorkflowRunIdentity | undefined {
  const id = draft.id.trim();
  if (!service || !id) return undefined;
  const scope = draft.scope.trim();
  return {
    service,
    id,
    ...(hasScope && scope ? { scope } : {}),
  };
}
