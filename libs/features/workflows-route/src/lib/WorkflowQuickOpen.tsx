import { IconName } from '@restate/ui/icons';
import { PanelTableQuickOpen } from '@restate/ui/table';
import {
  type WorkflowOpenDraft,
  workflowIdentityFromOpenDraft,
} from './workflows.open';

export interface WorkflowQuickOpenProps {
  draft: WorkflowOpenDraft;
  disabled: boolean;
  onChange: (draft: WorkflowOpenDraft) => void;
  onOpen: VoidFunction;
  service: string;
}

export function WorkflowQuickOpen({
  draft,
  disabled,
  onChange,
  onOpen,
  service,
}: WorkflowQuickOpenProps) {
  const identity = workflowIdentityFromOpenDraft(service, draft);

  return (
    <PanelTableQuickOpen
      ariaLabel="Go to a Workflow run"
      label="Go to run"
      iconName={IconName.Workflow}
      inputLabel="Workflow ID"
      placeholder="Workflow ID"
      value={draft.id}
      onChange={(id) => onChange({ ...draft, id })}
      onOpen={onOpen}
      isValid={Boolean(identity)}
      disabled={disabled}
      scope={{
        value: draft.scope,
        onChange: (scope) => onChange({ ...draft, scope }),
      }}
    />
  );
}
