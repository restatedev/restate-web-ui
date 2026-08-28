import { IconName } from '@restate/ui/icons';
import { PanelTableQuickOpen } from '@restate/ui/table';
import {
  type WorkflowOpenDraft,
  workflowIdentityFromOpenDraft,
} from './workflows.open';

export interface WorkflowQuickOpenProps {
  draft: WorkflowOpenDraft;
  disabled: boolean;
  hasScope: boolean;
  onChange: (draft: WorkflowOpenDraft) => void;
  onOpen: VoidFunction;
  service: string;
}

export function WorkflowQuickOpen({
  draft,
  disabled,
  hasScope,
  onChange,
  onOpen,
  service,
}: WorkflowQuickOpenProps) {
  const identity = workflowIdentityFromOpenDraft(service, draft, hasScope);

  return (
    <PanelTableQuickOpen
      ariaLabel="Open a Workflow run"
      label="Open workflow"
      iconName={IconName.Workflow}
      inputLabel="Workflow ID"
      placeholder="Workflow ID"
      value={draft.id}
      onChange={(id) => onChange({ ...draft, id })}
      onOpen={onOpen}
      isValid={Boolean(identity)}
      disabled={disabled}
      scope={
        hasScope
          ? {
              value: draft.scope,
              onChange: (scope) => onChange({ ...draft, scope }),
            }
          : undefined
      }
    />
  );
}
