import { withConfirmation } from '@restate/ui/dialog';
import { CANCEL_INVOCATION_QUERY_PARAM } from '../constants';
import { FormEvent } from 'react';
import { useCancelInvocation } from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { Link } from '@restate/ui/link';
import { IconName } from '@restate/ui/icons';
import { useSearchParams } from 'react-router';

function CancelInvocationContent() {
  const [searchParams] = useSearchParams();
  const invocationId = searchParams.get(CANCEL_INVOCATION_QUERY_PARAM);

  return (
    <input type="hidden" name="invocation-id" value={invocationId || ''} />
  );
}

export const CancelInvocation = withConfirmation({
  queryParam: CANCEL_INVOCATION_QUERY_PARAM,

  useMutation: useCancelInvocation,

  buildUseMutationInput: (searchParams) =>
    searchParams.get(CANCEL_INVOCATION_QUERY_PARAM),

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

  title: 'Cancel Invocation',
  icon: IconName.Cancel,
  iconClassName: 'fill-red-50 text-red-400 ',
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
