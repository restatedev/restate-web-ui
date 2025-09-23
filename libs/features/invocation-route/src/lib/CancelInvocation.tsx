import {
  DialogClose,
  DialogContent,
  DialogFooter,
  QueryDialog,
} from '@restate/ui/dialog';
import { CANCEL_INVOCATION_QUERY_PARAM } from './constants';
import { Form, useSearchParams } from 'react-router';
import { Button, SubmitButton } from '@restate/ui/button';
import { ErrorBanner } from '@restate/ui/error';
import { FormEvent, useId } from 'react';
import { useCancelInvocation } from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';

export function CancelInvocation() {
  const formId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const invocationId = searchParams.get(CANCEL_INVOCATION_QUERY_PARAM);

  const { mutate, isPending, error } = useCancelInvocation(
    String(invocationId),
    {
      onSuccess(data, variables) {
        setSearchParams(
          (old) => {
            old.delete(CANCEL_INVOCATION_QUERY_PARAM);
            return old;
          },
          { preventScrollReset: true },
        );
        showSuccessNotification(
          <>
            <code>{variables.parameters?.path.invocation_id}</code> has been
            successfully registered for cancellation.
          </>,
        );
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
    <QueryDialog query={CANCEL_INVOCATION_QUERY_PARAM}>
      <DialogContent className="max-w-lg">
        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-1 text-lg leading-6 font-medium text-gray-900">
            <Icon
              name={IconName.Cancel}
              className="-ml-2 h-10 w-10 fill-red-50 p-1.5 text-red-400 drop-shadow-md"
            />
            Cancel Invocation
          </h3>
          <div className="flex flex-col gap-2 text-sm text-gray-500">
            <p>
              Are you sure you want to cancel{' '}
              <code className="inline-block rounded-md bg-red-50 p-0.5 text-red-700 ring-red-600/10">
                {invocationId}
              </code>
              ?
            </p>

            <p className="mt-2 flex gap-2 rounded-xl bg-blue-50 p-3 text-0.5xs text-blue-600">
              <Icon
                className="h-5 w-5 shrink-0 fill-blue-600 text-blue-100"
                name={IconName.Info}
              />
              <span className="block">
                Cancellation frees held resources, cooperates with your handler
                code to roll back changes, and allows proper cleanup. It is
                non-blocking, so the call may return before cleanup finishes. In
                rare cases, cancellation may not take effect, retry the
                operation if needed.{' '}
                <Link
                  href="https://docs.restate.dev/services/invocation/managing-invocations#cancel"
                  variant="secondary"
                  className="text-blue-600"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Learn more…
                </Link>
              </span>
            </p>
          </div>
          <Form
            id={formId}
            method="DELETE"
            action={`/invocations/${invocationId}`}
            onSubmit={submitHandler}
          >
            <DialogFooter>
              <div className="flex flex-col gap-2">
                {error && <ErrorBanner errors={[error]} />}
                <div className="flex gap-2">
                  <DialogClose>
                    <Button
                      variant="secondary"
                      className="flex-auto"
                      disabled={isPending}
                      autoFocus
                    >
                      Close
                    </Button>
                  </DialogClose>
                  <SubmitButton
                    variant="destructive"
                    form={formId}
                    className="flex-auto"
                  >
                    Cancel
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
