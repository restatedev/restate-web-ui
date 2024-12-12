import { CancelInvocation } from './CancelInvocation';
import { KillInvocation } from './KillInvocation';
import { PurgeInvocation } from './PurgeInvocation';

export function DeleteInvocation() {
  return (
    <>
      <KillInvocation />
      <PurgeInvocation />
      <CancelInvocation />
    </>
  );
}
