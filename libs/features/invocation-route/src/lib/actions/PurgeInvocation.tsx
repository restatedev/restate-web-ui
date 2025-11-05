import { withConfirmation } from '@restate/ui/dialog';
import { FormEvent } from 'react';
import { usePurgeInvocation } from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { Link } from '@restate/ui/link';
import { useSearchParams } from 'react-router';
import { IconName } from '@restate/ui/icons';

const PURGE_INVOCATION_QUERY_PARAM = 'purge-invocation';

function PurgeInvocationContent() {
  const [searchParams] = useSearchParams();
  const invocationId = searchParams.get(PURGE_INVOCATION_QUERY_PARAM);

  return (
    <input type="hidden" name="invocation-id" value={invocationId || ''} />
  );
}

export const PurgeInvocation = withConfirmation({
  queryParam: PURGE_INVOCATION_QUERY_PARAM,
  shouldShowSkipConfirmation: true,
  userPreferenceId: 'skip-purge-action-dialog',

  useMutation: usePurgeInvocation,

  getFormData: function (...args: string[]) {
    const [invocationId] = args;
    const formData = new FormData();
    formData.append('invocation-id', String(invocationId));
    return formData;
  },

  getQueryParamValue: function (input) {
    if (input instanceof URLSearchParams) {
      return input.get(PURGE_INVOCATION_QUERY_PARAM);
    } else {
      return input.get('invocation-id') as string;
    }
  },
  getUseMutationInput: function (input) {
    if (input instanceof URLSearchParams) {
      return input.get(PURGE_INVOCATION_QUERY_PARAM);
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
  formMethod: 'DELETE',

  Content: PurgeInvocationContent,

  onSuccess: (_data, variables) => {
    showSuccessNotification(
      <>
        <code>{variables.parameters?.path.invocation_id}</code> has been
        successfully deleted.
      </>,
    );
  },
});
