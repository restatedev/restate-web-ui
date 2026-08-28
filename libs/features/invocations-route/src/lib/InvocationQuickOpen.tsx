import { IconName } from '@restate/ui/icons';
import { PanelTableQuickOpen } from '@restate/ui/table';

export interface InvocationQuickOpenProps {
  invocationId: string;
  onChange: (invocationId: string) => void;
  onOpen: VoidFunction;
}

export function InvocationQuickOpen({
  invocationId,
  onChange,
  onOpen,
}: InvocationQuickOpenProps) {
  return (
    <PanelTableQuickOpen
      ariaLabel="Open an invocation"
      label="Open invocation"
      iconName={IconName.Invocation}
      inputLabel="Invocation ID"
      placeholder="Invocation ID"
      value={invocationId}
      onChange={onChange}
      onOpen={onOpen}
      isValid={Boolean(invocationId.trim())}
    />
  );
}
