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

  useMutation: useResumeInvocation,

  buildUseMutationInput: (searchParams) =>
    searchParams.get(RETRY_NOW_INVOCATION_QUERY_PARAM),

  onSubmit: (mutate, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
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

  Content: RetryNowInvocationContent,

  onSuccess: (_data, variables) => {
    showSuccessNotification(
      <>
        <code>{variables.parameters?.path.invocation_id}</code> is retrying now.
      </>,
    );
  },
});
