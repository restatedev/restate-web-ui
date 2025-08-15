import { CancelInvocation } from './CancelInvocation';
import { KillInvocation } from './KillInvocation';
import { PurgeInvocation } from './PurgeInvocation';
import { RestartInvocation } from './RestartInvocation';

export function InvocationActions() {
  return (
    <>
      <KillInvocation />
      <PurgeInvocation />
      <CancelInvocation />
      <RestartInvocation />
    </>
  );
}
