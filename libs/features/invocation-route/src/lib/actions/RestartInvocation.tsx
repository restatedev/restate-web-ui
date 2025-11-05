import { withConfirmation } from '@restate/ui/dialog';
import { FormEvent } from 'react';
import { useRestartInvocationAsNew } from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { IconName } from '@restate/ui/icons';
import { useRestateContext } from '@restate/features/restate-context';
import { useSearchParams } from 'react-router';

const RESTART_AS_NEW_INVOCATION_QUERY_PARAM = 'restart-new-invocation';

function RestartInvocationContent() {
  const [searchParams] = useSearchParams();
  const invocationId = searchParams.get(RESTART_AS_NEW_INVOCATION_QUERY_PARAM);

  return (
    <input type="hidden" name="invocation-id" value={invocationId || ''} />
  );
}

export const RestartInvocation = withConfirmation({
  queryParam: RESTART_AS_NEW_INVOCATION_QUERY_PARAM,
  shouldShowSkipConfirmation: true,
  userPreferenceId: 'skip-restart-action-dialog',

  useMutation: useRestartInvocationAsNew,
  getFormData: function (...args: string[]) {
    const [invocationId] = args;
    const formData = new FormData();
    formData.append('invocation-id', String(invocationId));
    return formData;
  },
  ToastCountDownMessage: ({ formData }) => {
    const id = String(formData.get('invocation-id'));
    return (
      <>
        Restarting{' '}
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
        Failed to restart{' '}
        <code className="font-semibold">
          {id.substring(0, 8)}…{id.slice(-5)}
        </code>
      </>
    );
  },
  getQueryParamValue: function (input) {
    if (input instanceof URLSearchParams) {
      return input.get(RESTART_AS_NEW_INVOCATION_QUERY_PARAM);
    } else {
      return input.get('invocation-id') as string;
    }
  },

  getUseMutationInput: function (input) {
    if (input instanceof URLSearchParams) {
      return input.get(RESTART_AS_NEW_INVOCATION_QUERY_PARAM);
    } else {
      return input.get('invocation-id') as string;
    }
  },

  useHelpers: () => {
    const { baseUrl } = useRestateContext();
    return { baseUrl };
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

  title: 'Restart as new Invocation',
  icon: IconName.Restart,
  description: (
    <p>Are you sure you want to restart this invocation as a new one?</p>
  ),
  alertType: 'info',
  alertContent: (
    <>
      Creates a new invocation with the same input (if any) as the original,
      leaving the original unchanged. The new invocation will have a{' '}
      <span className="font-semibold">different ID</span>, and after a
      successful restart you'll be{' '}
      <span className="font-semibold">redirected</span> to it.
    </>
  ),
  submitText: 'Restart',
  formMethod: 'PATCH',

  Content: RestartInvocationContent,

  onSuccess: (
    data,
    _variables,
    _context,
    { navigate, searchParams, baseUrl },
  ) => {
    const invocationId = _variables.parameters?.path.invocation_id;
    const newInvocationId = data?.new_invocation_id;
    if (newInvocationId) {
      searchParams.delete(RESTART_AS_NEW_INVOCATION_QUERY_PARAM);
      navigate({
        pathname: `${baseUrl}/invocations/${newInvocationId}`,
        search: searchParams.toString(),
      });
      showSuccessNotification(
        <p>
          <code className="font-semibold">
            {newInvocationId.substring(0, 8)}…{newInvocationId.slice(-5)}
          </code>{' '}
          was created as the new invocation after restarting{' '}
          <code>
            {invocationId?.substring(0, 8)}…{invocationId?.slice(-5)}
          </code>
          .
        </p>,
      );
    }
  },
});
