import { withConfirmation } from '@restate/ui/dialog';
import { FormEvent } from 'react';
import {
  useGetInvocationJournalWithInvocationV2,
  useRestartWorkflowAsNew,
} from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { IconName } from '@restate/ui/icons';
import { useRestateContext } from '@restate/features/restate-context';
import { useSearchParams } from 'react-router';
import { FormFieldInput } from '@restate/ui/form-field';

export const RESTART_AS_NEW_WORKFLOW_QUERY_PARAM = 'restart-new-workflow';

function RestartWorkflowContent() {
  const [searchParams] = useSearchParams();
  const invocationId = searchParams.get(RESTART_AS_NEW_WORKFLOW_QUERY_PARAM);

  useGetInvocationJournalWithInvocationV2(String(invocationId), {
    refetchOnMount: false,
    staleTime: 0,
    enabled: !!invocationId,
  });

  return (
    <>
      <FormFieldInput
        className="mt-4 min-w-xs flex-auto basis-[calc(50%-var(--spacing)*2)] [&_button>*]:max-w-full"
        label={
          <>
            New Workflow ID
            <span slot="description">
              Journal is retained up to and including this action
            </span>
          </>
        }
        placeholder={'new workflow id…'}
        name="workflow-id"
        required
      />

      <input type="hidden" name="invocation-id" value={invocationId || ''} />
    </>
  );
}

export const RestartWorkflow = withConfirmation({
  queryParam: RESTART_AS_NEW_WORKFLOW_QUERY_PARAM,
  shouldShowSkipConfirmation: false,
  userPreferenceId: 'skip-restart-action-dialog',
  useMutation: useRestartWorkflowAsNew,
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
        Restarting a new workflow from{' '}
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
      return input.get(RESTART_AS_NEW_WORKFLOW_QUERY_PARAM);
    } else {
      return input.get('invocation-id') as string;
    }
  },

  getUseMutationInput: function (input) {
    if (input instanceof URLSearchParams) {
      return input.get(RESTART_AS_NEW_WORKFLOW_QUERY_PARAM);
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

    const workflowId = formData.get('workflow-id');
    const invocationId = formData.get('invocation-id');

    mutate({
      workflowId: String(workflowId),
      invocationId: String(invocationId),
    });
  },

  title: 'Restart as new Workflow',
  icon: IconName.Restart,
  description: (
    <p>Are you sure you want to restart this workflow as a new one?</p>
  ),
  alertType: 'info',
  // TODO
  alertContent: (
    <>
      Creates a new invocation with the journal retained up to the selected
      action, leaving the original unchanged. The new invocation will have a{' '}
      <span className="font-semibold">different ID</span>, and after a
      successful restart you'll be{' '}
      <span className="font-semibold">redirected</span> to it.
    </>
  ),
  submitText: 'Restart',
  formMethod: 'POST',
  formAction: (invocation_id) => `/invocations/${invocation_id}/restart-as-new`,

  Content: RestartWorkflowContent,

  onSuccess: (
    data,
    _variables,
    _context,
    { navigate, searchParams, baseUrl },
  ) => {
    const invocationId = _variables.invocationId;
    const newInvocationId = data?.invocationId;
    console.log(data);
    if (newInvocationId) {
      searchParams.delete(RESTART_AS_NEW_WORKFLOW_QUERY_PARAM);
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
