import { withConfirmation } from '@restate/ui/dialog';
import { FormEvent } from 'react';
import { useResumeInvocation } from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { IconName } from '@restate/ui/icons';
import { useSearchParams } from 'react-router';

const RETRY_NOW_INVOCATION_QUERY_PARAM = 'retry-now-invocation';

function RetryNowInvocationContent() {
  const [searchParams] = useSearchParams();
  const invocationId = searchParams.get(RETRY_NOW_INVOCATION_QUERY_PARAM);

  return (
    <input type="hidden" name="invocation-id" value={invocationId || ''} />
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
        Retrying{' '}
        <code className="font-semibold">
          {id.substring(0, 8)}…{id.slice(-5)}
        </code>
      </>
    );
  },
  ToastErrorMessage: ({ formData }) => {
    const id = String(formData.get('invocation-id'));
    return (
      <>
        Failed to retry{' '}
        <code className="font-semibold">
          {id.substring(0, 8)}…{id.slice(-5)}
        </code>
      </>
    );
  },
  getFormData: function (...args: string[]) {
    const [invocationId] = args;
    const formData = new FormData();
    formData.append('invocation-id', String(invocationId));
    return formData;
  },
  getQueryParamValue: function (input) {
    if (input instanceof URLSearchParams) {
      return input.get(RETRY_NOW_INVOCATION_QUERY_PARAM);
    } else {
      return input.get('invocation-id') as string;
    }
  },
  getUseMutationInput: function (input) {
    if (input instanceof URLSearchParams) {
      return input.get(RETRY_NOW_INVOCATION_QUERY_PARAM);
    } else {
      return input.get('invocation-id') as string;
    }
  },

  onSubmit: (mutate, event: FormEvent<HTMLFormElement> | FormData) => {
    let formData: FormData;

    if (event instanceof FormData) {
      formData = event;
    } else {
      event.preventDefault();
      formData = new FormData(event.currentTarget);
    }
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
        <code className="font-semibold">
          {id.substring(0, 8)}…{id.slice(-5)}
        </code>{' '}
        is retrying.
      </>,
    );
  },
});
