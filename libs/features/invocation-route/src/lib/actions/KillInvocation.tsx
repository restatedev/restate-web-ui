import { withConfirmation } from '@restate/ui/dialog';
import { FormEvent } from 'react';
import { useKillInvocation } from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { Link } from '@restate/ui/link';
import { IconName } from '@restate/ui/icons';
import { useSearchParams } from 'react-router';

const KILL_INVOCATION_QUERY_PARAM = 'kill-invocation';

function KillInvocationContent() {
  const [searchParams] = useSearchParams();
  const invocationId = searchParams.get(KILL_INVOCATION_QUERY_PARAM);

  return (
    <input type="hidden" name="invocation-id" value={invocationId || ''} />
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
        Killing{' '}
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
        Failed to kill{' '}
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
      return input.get(KILL_INVOCATION_QUERY_PARAM);
    } else {
      return input.get('invocation-id') as string;
    }
  },
  getUseMutationInput: function (input) {
    if (input instanceof URLSearchParams) {
      return input.get(KILL_INVOCATION_QUERY_PARAM);
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
        <code className="font-semibold">
          {id.substring(0, 8)}…{id.slice(-5)}
        </code>{' '}
        has been successfully killed.
      </>,
    );
  },
});
