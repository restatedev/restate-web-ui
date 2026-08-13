import { withConfirmation } from '@restate/ui/dialog';
import { usePurgeInvocation } from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { Link } from '@restate/ui/link';
import { IconName } from '@restate/ui/icons';
import {
  getInvocationActionFormData,
  getInvocationActionId,
  getInvocationActionSubmitData,
  InvocationActionHiddenInput,
  InvocationActionId,
} from './invocationActionHelpers';

const PURGE_INVOCATION_QUERY_PARAM = 'purge-invocation';

function PurgeInvocationContent() {
  return (
    <InvocationActionHiddenInput queryParam={PURGE_INVOCATION_QUERY_PARAM} />
  );
}

export const PurgeInvocation = withConfirmation({
  queryParam: PURGE_INVOCATION_QUERY_PARAM,
  shouldShowSkipConfirmation: true,
  userPreferenceId: 'skip-purge-action-dialog',

  useMutation: usePurgeInvocation,
  ToastCountDownMessage: ({ formData }) => {
    const id = String(formData.get('invocation-id'));
    return (
      <>
        Purging <InvocationActionId value={id} />
      </>
    );
  },
  ToastErrorMessage: ({ formData }) => {
    const id = String(formData.get('invocation-id'));
    return (
      <>
        Failed to purge <InvocationActionId value={id} />
      </>
    );
  },
  getFormData: getInvocationActionFormData,
  getQueryParamValue: (input) =>
    getInvocationActionId(input, PURGE_INVOCATION_QUERY_PARAM),
  getUseMutationInput: (input) =>
    getInvocationActionId(input, PURGE_INVOCATION_QUERY_PARAM),

  onSubmit: (mutate, event) => {
    const formData = getInvocationActionSubmitData(event);
    const invocationId = formData.get('invocation-id');

    mutate({
      parameters: {
        path: { invocation_id: String(invocationId) },
      },
    });
  },

  title: 'Purge Invocation',
  description: <p>Are you sure you want to purge this invocation?</p>,
  iconClassName: 'text-red-400',
  icon: IconName.Trash,
  alertType: 'info',
  alertContent: (
    <>
      After an invocation completes, it will be retained by Restate for some
      time, in order to introspect it and, in case of idempotent requests, to
      perform deduplication.{' '}
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
  submitText: 'Purge',
  submitVariant: 'destructive',
  formMethod: 'PATCH',
  formAction: (invocation_id) => `/invocations/${invocation_id}/purge`,

  Content: PurgeInvocationContent,

  onSuccess: (_data, variables) => {
    const id = String(variables.parameters?.path.invocation_id);
    showSuccessNotification(
      <>
        <InvocationActionId value={id} /> has been successfully purged.
      </>,
    );
  },
});
