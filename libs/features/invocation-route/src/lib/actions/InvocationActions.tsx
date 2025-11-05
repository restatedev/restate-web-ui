import { CancelInvocation } from './CancelInvocation';
import { KillInvocation } from './KillInvocation';
import { PurgeInvocation } from './PurgeInvocation';
import { RestartInvocation } from './RestartInvocation';
import { ResumeInvocation } from './ResumeInvocation';
import { RetryNowInvocation } from './RetryNowInvocation';
import { PauseInvocation } from './PauseInvocation';

export function InvocationActions() {
  return (
    <>
      <KillInvocation.Dialog />
      <PurgeInvocation.Dialog />
      <CancelInvocation.Dialog />
      <RetryNowInvocation.Dialog />
      <RestartInvocation.Dialog />
      <ResumeInvocation.Dialog />
      <PauseInvocation.Dialog />
    </>
  );
}
