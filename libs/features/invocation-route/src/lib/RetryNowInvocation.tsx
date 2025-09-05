import {
  DialogClose,
  DialogContent,
  DialogFooter,
  QueryDialog,
} from '@restate/ui/dialog';
import { RETRY_NOW_INVOCATION_QUERY_PARAM } from './constants';
import { Form, useSearchParams } from 'react-router';
import { Button, SubmitButton } from '@restate/ui/button';
import { ErrorBanner } from '@restate/ui/error';
import { FormEvent, useId } from 'react';
import { useResumeInvocation } from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { Icon, IconName } from '@restate/ui/icons';

export function RetryNowInvocation() {
  const formId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const invocationId = searchParams.get(RETRY_NOW_INVOCATION_QUERY_PARAM);

  const { mutate, isPending, error, reset } = useResumeInvocation(
    invocationId ?? '',
    {
      onSuccess(data, variables) {
        setSearchParams(
          (old) => {
            old.delete(RETRY_NOW_INVOCATION_QUERY_PARAM);
            return old;
          },
          { preventScrollReset: true },
        );
        showSuccessNotification(
          <>
            <code>{invocationId}</code> is retrying now.
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
    <QueryDialog query={RETRY_NOW_INVOCATION_QUERY_PARAM}>
      <DialogContent className="max-w-lg">
        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-1 text-lg leading-6 font-medium text-gray-900">
            <Icon
              name={IconName.RetryNow}
              className="-ml-2 h-10 w-10 fill-blue-50 p-1.5 text-blue-400 drop-shadow-md"
            />
            Retry Invocation now
          </h3>
          <div className="flex flex-col gap-2 text-sm text-gray-500">
            <p className="mt-2 text-sm text-gray-500">
              Invocation{' '}
              <code className="inline-block rounded-md bg-blue-50 p-0.5 text-blue-600 ring-blue-600/10">
                {invocationId}
              </code>{' '}
              is currently backing off after failed retries. Do you want to
              trigger a retry immediately?
            </p>
          </div>
          <Form
            id={formId}
            method="PATCH"
            action={`/invocations/${invocationId}/resume`}
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
                      onClick={() => reset()}
                    >
                      Close
                    </Button>
                  </DialogClose>
                  <SubmitButton form={formId} className="flex-auto">
                    Retry
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
