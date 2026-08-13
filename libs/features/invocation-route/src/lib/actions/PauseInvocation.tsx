import { withConfirmation } from '@restate/ui/dialog';
import { usePauseInvocation } from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { IconName } from '@restate/ui/icons';
import {
  getInvocationActionFormData,
  getInvocationActionId,
  getInvocationActionSubmitData,
  InvocationActionHiddenInput,
  InvocationActionId,
} from './invocationActionHelpers';

const PAUSE_INVOCATION_QUERY_PARAM = 'pause-invocation';

function PauseInvocationContent() {
  return (
    <InvocationActionHiddenInput queryParam={PAUSE_INVOCATION_QUERY_PARAM} />
  );
}

export const PauseInvocation = withConfirmation({
  queryParam: PAUSE_INVOCATION_QUERY_PARAM,
  shouldShowSkipConfirmation: true,
  userPreferenceId: 'skip-pause-action-dialog',
  useMutation: usePauseInvocation,

  getFormData: getInvocationActionFormData,
  getQueryParamValue: (input) =>
    getInvocationActionId(input, PAUSE_INVOCATION_QUERY_PARAM),
  getUseMutationInput: (input) =>
    getInvocationActionId(input, PAUSE_INVOCATION_QUERY_PARAM),

  onSubmit: (mutate, event) => {
    const formData = getInvocationActionSubmitData(event);
    const invocationId = formData.get('invocation-id');

    mutate({
      parameters: {
        path: { invocation_id: String(invocationId) },
      },
    });
  },
  ToastCountDownMessage: ({ formData }) => {
    const id = String(formData.get('invocation-id'));
    return (
      <>
        Pausing <InvocationActionId value={id} />
      </>
    );
  },
  ToastErrorMessage: ({ formData }) => {
    const id = String(formData.get('invocation-id'));
    return (
      <>
        Failed to pause <InvocationActionId value={id} />
      </>
    );
  },

  title: 'Pause Invocation',
  icon: IconName.Pause,
  iconClassName: 'text-red-400 ',
  description: (
    <p className="mt-2 text-sm text-gray-500">
      Do you want to pause a this invocation? The pause may not take effect
      right away.
    </p>
  ),
  submitText: 'Pause',
  submitVariant: 'destructive',
  formMethod: 'PATCH',
  formAction: (invocation_id) => `/invocations/${invocation_id}/pause`,

  Content: PauseInvocationContent,

  onSuccess: (_data, variables) => {
    const id = String(variables.parameters?.path.invocation_id);

    showSuccessNotification(
      <>
        <InvocationActionId value={id} /> has been successfully registered to be
        paused.
      </>,
    );
  },
});
