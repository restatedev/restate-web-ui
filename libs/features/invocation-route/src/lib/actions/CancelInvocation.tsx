import { withConfirmation } from '@restate/ui/dialog';
import { FormEvent } from 'react';
import { useCancelInvocation } from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { Link } from '@restate/ui/link';
import { IconName } from '@restate/ui/icons';
import { useSearchParams } from 'react-router';

const CANCEL_INVOCATION_QUERY_PARAM = 'cancel-invocation';

function CancelInvocationContent() {
  const [searchParams] = useSearchParams();
  const invocationId = searchParams.get(CANCEL_INVOCATION_QUERY_PARAM);

  return (
    <input type="hidden" name="invocation-id" value={invocationId || ''} />
  );
}

export const CancelInvocation = withConfirmation({
  queryParam: CANCEL_INVOCATION_QUERY_PARAM,
  shouldShowSkipConfirmation: true,
  userPreferenceId: 'skip-cancel-action-dialog',
  useMutation: useCancelInvocation,

  getFormData: function (...args: string[]) {
    const [invocationId] = args;
    const formData = new FormData();
    formData.append('invocation-id', String(invocationId));
    return formData;
  },
  getQueryParamValue: function (input) {
    if (input instanceof URLSearchParams) {
      return input.get(CANCEL_INVOCATION_QUERY_PARAM);
    } else {
      return input.get('invocation-id') as string;
    }
  },
  getUseMutationInput: function (input) {
    if (input instanceof URLSearchParams) {
      return input.get(CANCEL_INVOCATION_QUERY_PARAM);
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
  submitText: 'Cancel',
  submitVariant: 'destructive',
  formMethod: 'DELETE',

  Content: CancelInvocationContent,

  onSuccess: (_data, variables) => {
    showSuccessNotification(
      <>
        <code>{variables.parameters?.path.invocation_id}</code> has been
        successfully registered for cancellation.
      </>,
    );
  },
});
