import { withConfirmation } from '@restate/ui/dialog';
import { useCancelInvocation } from '@restate/data-access/admin-api-hooks';
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

const CANCEL_INVOCATION_QUERY_PARAM = 'cancel-invocation';

function CancelInvocationContent() {
  return (
    <InvocationActionHiddenInput queryParam={CANCEL_INVOCATION_QUERY_PARAM} />
  );
}

export const CancelInvocation = withConfirmation({
  queryParam: CANCEL_INVOCATION_QUERY_PARAM,
  shouldShowSkipConfirmation: true,
  userPreferenceId: 'skip-cancel-action-dialog',
  useMutation: useCancelInvocation,

  getFormData: getInvocationActionFormData,
  getQueryParamValue: (input) =>
    getInvocationActionId(input, CANCEL_INVOCATION_QUERY_PARAM),
  getUseMutationInput: (input) =>
    getInvocationActionId(input, CANCEL_INVOCATION_QUERY_PARAM),

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
        Cancelling <InvocationActionId value={id} />
      </>
    );
  },
  ToastErrorMessage: ({ formData }) => {
    const id = String(formData.get('invocation-id'));
    return (
      <>
        Failed to cancel <InvocationActionId value={id} />
      </>
    );
  },

  title: 'Cancel Invocation',
  icon: IconName.Cancel,
  iconClassName: 'text-red-400 ',
  description: <p>Are you sure you want to cancel this invocation?</p>,
  alertType: 'info',
  alertContent: (
    <>
      Cancellation frees held resources, cooperates with your handler code to
      roll back changes, and allows proper cleanup. It is non-blocking, so the
      call may return before cleanup finishes. In rare cases, cancellation may
      not take effect, retry the operation if needed.{' '}
      <Link
        href="https://docs.restate.dev/services/invocation/managing-invocations#cancel"
        variant="secondary"
        className="text-blue-600"
        target="_blank"
        rel="noopener noreferrer"
      >
        Learn more…
      </Link>
    </>
  ),
  submitText: 'Confirm',
  submitVariant: 'destructive',
  formMethod: 'PATCH',
  formAction: (invocation_id) => `/invocations/${invocation_id}/cancel`,

  Content: CancelInvocationContent,

  onSuccess: (_data, variables) => {
    const id = String(variables.parameters?.path.invocation_id);

    showSuccessNotification(
      <>
        <InvocationActionId value={id} /> has been successfully registered for
        cancellation.
      </>,
    );
  },
});
