import { EditAccessDialog } from './EditAccessDialog';
import { EditRetentionDialog } from './EditRetentionDialog';
import { EditTimeoutDialog } from './EditTimeoutDialog';

export function EditService() {
  return (
    <>
      <EditRetentionDialog />
      <EditTimeoutDialog />
      <EditAccessDialog />
    </>
  );
}
