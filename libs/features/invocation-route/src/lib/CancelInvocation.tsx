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
import { FormFieldInput } from '@restate/ui/form-field';
import { FormEvent, useId } from 'react';
import { useDeleteInvocation } from '@restate/data-access/admin-api';
import { showSuccessNotification } from '@restate/ui/notification';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';

export function CancelInvocation() {
  const formId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const invocationId = searchParams.get(CANCEL_INVOCATION_QUERY_PARAM);

  const { mutate, isPending, error } = useDeleteInvocation(
    String(invocationId),
    {
      onSuccess(data, variables) {
        setSearchParams((old) => {
          old.delete(CANCEL_INVOCATION_QUERY_PARAM);
          return old;
        });
        showSuccessNotification(
          <>
            <code>{variables.parameters?.path.invocation_id}</code> has been
            successfully registered for cancellation.
          </>
        );
      },
    }
  );

  const submitHandler = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    mutate({
      parameters: {
        path: { invocation_id: String(invocationId) },
        query: { mode: 'Cancel' },
      },
    });
  };

  return (
    <QueryDialog query={CANCEL_INVOCATION_QUERY_PARAM}>
      <DialogContent className="max-w-lg">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Confirm Invocation cancellation
          </h3>
          <div className="text-sm text-gray-500 flex flex-col gap-2">
            <p>
              Are you sure you want to cancel{' '}
              <code className="bg-red-50 text-red-700 ring-red-600/10 p-0.5 inline-block rounded-md">
                {invocationId}
              </code>
              ?
            </p>

            <p className="mt-2 text-code flex rounded-xl bg-blue-50 p-3 text-blue-600 gap-2">
              <Icon
                className="h-5 w-5  text-blue-100 fill-blue-600 shrink-0"
                name={IconName.Info}
              />
              <span className="block">
                Canceling an invocation frees resources and rolls back changes
                made so far. It's a non-blocking operation, so cancellation
                completion is not guaranteed.{' '}
                <Link
                  href="https://docs.restate.dev/operate/invocation/#cancelling-invocations"
                  variant="secondary"
                  className="text-blue-600"
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
            <p className="text-sm text-gray-500 mt-2">
              Please confirm to proceed or close to keep the Invocation.
            </p>
            <FormFieldInput
              autoFocus
              required
              pattern="cancel"
              name="confirm"
              className="mt-2"
              placeholder='Type "cancel" to confirm'
              errorMessage={(errors) => {
                const isMisMatch =
                  errors.validationDetails.patternMismatch &&
                  !errors.validationDetails.valueMissing;
                if (isMisMatch) {
                  return 'Type "cancel" to confirm';
                }
                return errors.validationErrors;
              }}
            />
            <DialogFooter>
              <div className="flex gap-2 flex-col">
                {error && <ErrorBanner errors={[error]} />}
                <div className="flex gap-2">
                  <DialogClose>
                    <Button
                      variant="secondary"
                      className="flex-auto"
                      disabled={isPending}
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
