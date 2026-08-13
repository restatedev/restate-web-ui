import { withConfirmation } from '@restate/ui/dialog';
import { useResumeInvocation } from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { IconName } from '@restate/ui/icons';
import {
  getInvocationActionFormData,
  getInvocationActionId,
  getInvocationActionSubmitData,
  InvocationActionHiddenInput,
  InvocationActionId,
} from './invocationActionHelpers';

const RETRY_NOW_INVOCATION_QUERY_PARAM = 'retry-now-invocation';

function RetryNowInvocationContent() {
  return (
    <InvocationActionHiddenInput
      queryParam={RETRY_NOW_INVOCATION_QUERY_PARAM}
    />
  );
}

export const RetryNowInvocation = withConfirmation({
  queryParam: RETRY_NOW_INVOCATION_QUERY_PARAM,
  shouldShowSkipConfirmation: true,
  userPreferenceId: 'skip-retry-action-dialog',

  useMutation: useResumeInvocation,
  ToastCountDownMessage: ({ formData }) => {
    const id = String(formData.get('invocation-id'));
    return (
      <>
        Retrying <InvocationActionId value={id} />
      </>
    );
  },
  ToastErrorMessage: ({ formData }) => {
    const id = String(formData.get('invocation-id'));
    return (
      <>
        Failed to retry <InvocationActionId value={id} />
      </>
    );
  },
  getFormData: getInvocationActionFormData,
  getQueryParamValue: (input) =>
    getInvocationActionId(input, RETRY_NOW_INVOCATION_QUERY_PARAM),
  getUseMutationInput: (input) =>
    getInvocationActionId(input, RETRY_NOW_INVOCATION_QUERY_PARAM),

  onSubmit: (mutate, event) => {
    const formData = getInvocationActionSubmitData(event);
    const invocationId = formData.get('invocation-id');

    mutate({
      parameters: {
        path: { invocation_id: String(invocationId) },
      },
    });
  },

  title: 'Retry Invocation now',
  icon: IconName.RetryNow,
  description: (
    <p className="mt-2 text-sm text-gray-500">
      This invocation is currently backing off after failed retries. Do you want
      to trigger a retry immediately?
    </p>
  ),
  submitText: 'Retry',
  formMethod: 'PATCH',
  formAction: (invocation_id) => `/invocations/${invocation_id}/resume`,

  Content: RetryNowInvocationContent,

  onSuccess: (_data, variables) => {
    const id = String(variables.parameters?.path.invocation_id);
    showSuccessNotification(
      <>
        <InvocationActionId value={id} /> is retrying.
      </>,
    );
  },
});
