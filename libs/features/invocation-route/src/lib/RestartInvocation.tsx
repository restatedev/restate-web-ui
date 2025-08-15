import {
  DialogClose,
  DialogContent,
  DialogFooter,
  QueryDialog,
} from '@restate/ui/dialog';
import { RESTART_AS_NEW_INVOCATION_QUERY_PARAM } from './constants';
import { Form, useHref, useNavigate, useSearchParams } from 'react-router';
import { Button, SubmitButton } from '@restate/ui/button';
import { ErrorBanner } from '@restate/ui/error';
import { FormEvent, useId } from 'react';
import { useRestartInvocationAsNew } from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';

export function RestartInvocation() {
  const formId = useId();
  const [searchParams] = useSearchParams();
  const invocationId = searchParams.get(RESTART_AS_NEW_INVOCATION_QUERY_PARAM);
  const navigate = useNavigate();
  const base = useHref('/');

  const { mutate, isPending, error, reset } = useRestartInvocationAsNew(
    String(invocationId),
    {
      onSuccess(data, variables) {
        const newInvocationId = data?.new_invocation_id;
        if (newInvocationId) {
          searchParams.delete(RESTART_AS_NEW_INVOCATION_QUERY_PARAM);
          navigate({
            pathname: `/invocations/${newInvocationId}`,
            search: searchParams.toString(),
          });
          showSuccessNotification(
            <>
              <code>{newInvocationId}</code> has been successfully restarted.
            </>,
          );
        }
      },
    },
  );

  const submitHandler = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    mutate({
      parameters: {
        path: { invocation_id: String(invocationId) },
      },
    });
  };

  return (
    <QueryDialog query={RESTART_AS_NEW_INVOCATION_QUERY_PARAM}>
      <DialogContent className="max-w-lg">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Confirm restart as new Invocation
          </h3>
          <div className="flex flex-col gap-2 text-sm text-gray-500">
            <p className="mt-2 text-sm text-gray-500">
              Creates a new invocation with the same input (if any) from the
              original, leaving the original invocation unchanged.
            </p>
          </div>
          <Form
            id={formId}
            method="PATCH"
            action={`/invocations/${invocationId}/restart-as-new`}
            onSubmit={submitHandler}
          >
            <p className="text-sm text-gray-600">
              Restart invocation{' '}
              <code className="inline-block rounded-md bg-blue-50 p-0.5 text-blue-600 ring-blue-600/10">
                {invocationId}
              </code>{' '}
              as a new one?
            </p>
            <DialogFooter>
              <div className="flex flex-col gap-2">
                {error && <ErrorBanner errors={[error]} />}
                <div className="flex gap-2">
                  <DialogClose>
                    <Button
                      variant="secondary"
                      className="flex-auto"
                      disabled={isPending}
                      onClick={() => reset()}
                    >
                      Close
                    </Button>
                  </DialogClose>
                  <SubmitButton form={formId} className="flex-auto">
                    Restart
                  </SubmitButton>
                </div>
              </div>
            </DialogFooter>
          </Form>
        </div>
      </DialogContent>
    </QueryDialog>
  );
}
