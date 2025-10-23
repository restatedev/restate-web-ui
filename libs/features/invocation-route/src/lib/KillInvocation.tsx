import { withConfirmation } from '@restate/ui/dialog';
import { KILL_INVOCATION_QUERY_PARAM } from './constants';
import { FormEvent } from 'react';
import { useKillInvocation } from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { Link } from '@restate/ui/link';
import { IconName } from '@restate/ui/icons';
import { useSearchParams } from 'react-router';

function KillInvocationContent() {
  const [searchParams] = useSearchParams();
  const invocationId = searchParams.get(KILL_INVOCATION_QUERY_PARAM);

  return (
    <input type="hidden" name="invocation-id" value={invocationId || ''} />
  );
}

export const KillInvocation = withConfirmation({
  queryParam: KILL_INVOCATION_QUERY_PARAM,

  useMutation: useKillInvocation,

  buildUseMutationInput: (searchParams) =>
    searchParams.get(KILL_INVOCATION_QUERY_PARAM),

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

  title: 'Kill Invocation',
  icon: IconName.Kill,
  iconClassName: 'fill-red-50 text-red-400',
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
  formMethod: 'DELETE',

  Content: KillInvocationContent,

  onSuccess: (_data, variables) => {
    showSuccessNotification(
      <>
        <code>{variables.parameters?.path.invocation_id}</code> has been
        successfully killed.
      </>,
    );
  },
});
