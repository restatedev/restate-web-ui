import { useSendInvocationSignal } from '@restate/data-access-admin-api-hooks';
import { useCodecRuntime } from '@restate/features-codec';
import { useDialog } from '@restate/ui-dialog';
import {
  CompleteActionDialog,
  CompleteForm,
  showCompletedNotification,
} from './CompleteAction';

export function CompleteSignalAction({
  signalName,
  invocationId,
}: {
  signalName: string;
  invocationId: string;
}) {
  return (
    <CompleteActionDialog surface="complete-signal">
      <CompleteSignalForm signalName={signalName} invocationId={invocationId} />
    </CompleteActionDialog>
  );
}

function CompleteSignalForm({
  signalName,
  invocationId,
}: {
  signalName: string;
  invocationId: string;
}) {
  const { close } = useDialog();
  const { encode } = useCodecRuntime();
  const mutation = useSendInvocationSignal(invocationId, {
    encode,
    onSuccess(_data, variables) {
      close?.();
      showCompletedNotification(variables.signalName, variables.action);
    },
  });

  return (
    <CompleteForm
      noun="signal"
      target={signalName}
      formAction={`/invocations/${invocationId}/signals`}
      withCode
      isPending={mutation.isPending}
      error={mutation.error}
      onReset={mutation.reset}
      onComplete={(values) => mutation.mutate({ signalName, ...values })}
    />
  );
}
