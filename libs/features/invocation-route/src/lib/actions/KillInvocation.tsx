import { withConfirmation } from '@restate/ui/dialog';
import { useKillInvocation } from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { Link } from '@restate/ui/link';
import { IconName } from '@restate/ui/icons';
import {
  getInvocationActionFormData,
  getInvocationActionId,
  getInvocationActionSubmitData,
  InvocationActionHiddenInput,
  InvocationActionId,
} from './invocationActionHelpers';

const KILL_INVOCATION_QUERY_PARAM = 'kill-invocation';

function KillInvocationContent() {
  return (
    <InvocationActionHiddenInput queryParam={KILL_INVOCATION_QUERY_PARAM} />
  );
}

export const KillInvocation = withConfirmation({
  queryParam: KILL_INVOCATION_QUERY_PARAM,
  shouldShowSkipConfirmation: true,
  userPreferenceId: 'skip-kill-action-dialog',

  useMutation: useKillInvocation,
  ToastCountDownMessage: ({ formData }) => {
    const id = String(formData.get('invocation-id'));
    return (
      <>
        Killing <InvocationActionId value={id} />
      </>
    );
  },
  ToastErrorMessage: ({ formData }) => {
    const id = String(formData.get('invocation-id'));
    return (
      <>
        Failed to kill <InvocationActionId value={id} />
      </>
    );
  },
  getFormData: getInvocationActionFormData,
  getQueryParamValue: (input) =>
    getInvocationActionId(input, KILL_INVOCATION_QUERY_PARAM),
  getUseMutationInput: (input) =>
    getInvocationActionId(input, KILL_INVOCATION_QUERY_PARAM),

  onSubmit: (mutate, event) => {
    const formData = getInvocationActionSubmitData(event);
    const invocationId = formData.get('invocation-id');

    mutate({
      parameters: {
        path: { invocation_id: String(invocationId) },
      },
    });
  },

  title: 'Kill Invocation',
  icon: IconName.Kill,
  iconClassName: 'text-red-400',
  description: <p>Are you sure you want to kill this invocation?</p>,
  alertType: 'warning',
  alertContent: (
    <>
      Killing immediately stops all calls in the invocation tree{' '}
      <strong>without executing compensation logic</strong>. This may leave your
      service in an inconsistent state. Only use as a last resort after trying
      other fixes.{' '}
      <Link
        href="https://docs.restate.dev/services/invocation/managing-invocations#kill"
        variant="secondary"
        className="text-orange-600"
        target="_blank"
        rel="noopener noreferrer"
      >
        Learn more…
      </Link>
    </>
  ),
  submitText: 'Kill',
  submitVariant: 'destructive',
  formMethod: 'PATCH',
  formAction: (invocation_id) => `/invocations/${invocation_id}/kill`,

  Content: KillInvocationContent,

  onSuccess: (_data, variables) => {
    const id = String(variables.parameters?.path.invocation_id);
    showSuccessNotification(
      <>
        <InvocationActionId value={id} /> has been successfully killed.
      </>,
    );
  },
});
