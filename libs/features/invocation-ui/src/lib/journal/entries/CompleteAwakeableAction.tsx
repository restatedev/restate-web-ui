import { useCompleteAwakeable } from '@restate/data-access-admin-api-hooks';
import { useCodecRuntime } from '@restate/features-codec';
import { useDialog } from '@restate/ui-dialog';
import {
  CompleteActionDialog,
  CompleteForm,
  showCompletedNotification,
} from './CompleteAction';

export function CompleteAwakeableAction({
  awakeableId,
  invocationId,
}: {
  awakeableId: string;
  invocationId: string;
}) {
  return (
    <CompleteActionDialog surface="complete-awakeable">
      <CompleteAwakeableForm
        awakeableId={awakeableId}
        invocationId={invocationId}
      />
    </CompleteActionDialog>
  );
}

function CompleteAwakeableForm({
  awakeableId,
  invocationId,
}: {
  awakeableId: string;
  invocationId: string;
}) {
  const { close } = useDialog();
  const { encode } = useCodecRuntime();
  const mutation = useCompleteAwakeable(invocationId, {
    encode,
    onSuccess(_data, variables) {
      close?.();
      showCompletedNotification(variables.awakeableId, variables.action);
    },
  });

  return (
    <CompleteForm
      noun="awakeable"
      target={awakeableId}
      formAction={`/invocations/${invocationId}/awakeables`}
      isPending={mutation.isPending}
      error={mutation.error}
      onReset={mutation.reset}
      onComplete={(values) => mutation.mutate({ awakeableId, ...values })}
    />
  );
}
