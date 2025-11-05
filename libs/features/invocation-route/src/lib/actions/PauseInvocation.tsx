import { withConfirmation } from '@restate/ui/dialog';
import { FormEvent } from 'react';
import { usePauseInvocation } from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { IconName } from '@restate/ui/icons';
import { useSearchParams } from 'react-router';

const PAUSE_INVOCATION_QUERY_PARAM = 'pause-invocation';

function PauseInvocationContent() {
  const [searchParams] = useSearchParams();
  const invocationId = searchParams.get(PAUSE_INVOCATION_QUERY_PARAM);

  return (
    <input type="hidden" name="invocation-id" value={invocationId || ''} />
  );
}

export const PauseInvocation = withConfirmation({
  queryParam: PAUSE_INVOCATION_QUERY_PARAM,
  shouldShowSkipConfirmation: true,
  userPreferenceId: 'skip-pause-action-dialog',
  useMutation: usePauseInvocation,

  getFormData: function (...args: string[]) {
    const [invocationId] = args;
    const formData = new FormData();
    formData.append('invocation-id', String(invocationId));
    return formData;
  },
  getQueryParamValue: function (input) {
    if (input instanceof URLSearchParams) {
      return input.get(PAUSE_INVOCATION_QUERY_PARAM);
    } else {
      return input.get('invocation-id') as string;
    }
  },
  getUseMutationInput: function (input) {
    if (input instanceof URLSearchParams) {
      return input.get(PAUSE_INVOCATION_QUERY_PARAM);
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
  ToastCountDownMessage: ({ formData }) => {
    const id = String(formData.get('invocation-id'));
    return (
      <>
        Pausing{' '}
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
        Failed to pause{' '}
        <code className="font-semibold">
          {id.substring(0, 8)}…{id.slice(-5)}
        </code>
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

  Content: PauseInvocationContent,

  onSuccess: (_data, variables) => {
    const id = String(variables.parameters?.path.invocation_id);

    showSuccessNotification(
      <>
        <code className="font-semibold">
          {id.substring(0, 8)}…{id.slice(-5)}
        </code>{' '}
        has been successfully registered to be paused.
      </>,
    );
  },
});
