import { CancelInvocation } from './CancelInvocation';
import { KillInvocation } from './KillInvocation';
import { PurgeInvocation } from './PurgeInvocation';
import { RestartInvocation } from './RestartInvocation';
import { ResumeInvocation } from './ResumeInvocation';
import { RetryNowInvocation } from './RetryNowInvocation';

export function InvocationActions() {
  return (
    <>
      <KillInvocation />
      <PurgeInvocation />
      <CancelInvocation />
      <RestartInvocation />
      <ResumeInvocation />
      <RetryNowInvocation />
    </>
  );
}
