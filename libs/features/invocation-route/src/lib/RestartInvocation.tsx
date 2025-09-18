import {
  DialogClose,
  DialogContent,
  DialogFooter,
  QueryDialog,
} from '@restate/ui/dialog';
import { RESTART_AS_NEW_INVOCATION_QUERY_PARAM } from './constants';
import { Form, useNavigate, useSearchParams } from 'react-router';
import { Button, SubmitButton } from '@restate/ui/button';
import { ErrorBanner } from '@restate/ui/error';
import { FormEvent, useId } from 'react';
import { useRestartInvocationAsNew } from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { Icon, IconName } from '@restate/ui/icons';
import { useRestateContext } from '@restate/features/restate-context';

export function RestartInvocation() {
  const formId = useId();
  const [searchParams] = useSearchParams();
  const invocationId = searchParams.get(RESTART_AS_NEW_INVOCATION_QUERY_PARAM);
  const navigate = useNavigate();
  const { baseUrl } = useRestateContext();

  const { mutate, isPending, error, reset } = useRestartInvocationAsNew(
    String(invocationId),
    {
      onSuccess(data, variables) {
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
          <h3 className="flex items-center gap-1 text-lg leading-6 font-medium text-gray-900">
            <Icon
              name={IconName.Restart}
              className="-ml-2 h-10 w-10 p-1.5 text-blue-400 drop-shadow-md"
            />
            Restart as new Invocation
          </h3>
          <div className="flex flex-col gap-2 text-sm text-gray-500">
            <p>
              Are you sure you want to restart{' '}
              <code className="inline-block rounded-md bg-blue-50 p-0.5 text-blue-600 ring-blue-600/10">
                {invocationId}
              </code>{' '}
              as a new one ?
            </p>

            <p className="mt-2 flex gap-2 rounded-xl bg-blue-50 p-3 text-0.5xs text-blue-600">
              <Icon
                className="h-5 w-5 shrink-0 fill-blue-600 text-blue-100"
                name={IconName.Info}
              />
              <span className="block">
                Creates a new invocation with the same input (if any) as the
                original, leaving the original unchanged. The new invocation
                will have a <span className="font-semibold">different ID</span>,
                and after a successful restart you'll be{' '}
                <span className="font-semibold">redirected</span> to it.
              </span>
            </p>
          </div>
          <Form
            id={formId}
            method="PATCH"
            action={`/invocations/${invocationId}/restart-as-new`}
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
