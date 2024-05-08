import { useSearchParams } from '@remix-run/react';
import { Button, SubmitButton } from '@restate/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@restate/ui/dialog';
import { useId } from 'react';
import { CREATE_ENVIRONMENT_PARAM_NAME } from './constants';
import { FormFieldInput } from '@restate/ui/form-field';
import { useAccountParam } from '@restate/features/cloud/routes-utils';
import { clientAction } from './action';
import { ErrorBanner } from '@restate/ui/error';
import { useFetcherWithError } from '@restate/util/remix';

export function CreateEnvironment() {
  const formId = useId();
  const accountId = useAccountParam();
  const action = `/accounts/${accountId}/environments`;
  const fetcher = useFetcherWithError<typeof clientAction>({ key: action });
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldShowCreateAccount =
    searchParams.get(CREATE_ENVIRONMENT_PARAM_NAME) === 'true';
  const close = () => {
    setSearchParams(
      (perv) => {
        perv.delete(CREATE_ENVIRONMENT_PARAM_NAME);
        return perv;
      },
      { preventScrollReset: true }
    );
    fetcher.resetErrors();
  };

  return (
    <Dialog
      open={shouldShowCreateAccount}
      onOpenChange={(isOpen) => {
        if (!isOpen && shouldShowCreateAccount) {
          close();
        }
      }}
    >
      <DialogContent>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Create environment
          </h3>
          <p className="text-sm text-gray-500">
            Setting up a restate Cloud environment is the most convenient method
            to acquire your dedicated restate server instance.
          </p>
          <div>
            <p className="text-sm text-gray-500 mt-2">
              Please provide a brief description for your new environment
            </p>
            <fetcher.Form id={formId} method="POST" action={action}>
              <FormFieldInput
                autoFocus
                required
                name="description"
                className="mt-2"
                placeholder="Description"
                maxLength={100}
              />
              <DialogFooter>
                <div className="flex gap-2 flex-col">
                  <ErrorBanner errors={fetcher.errors} />
                  <div className="flex gap-2">
                    <Button
                      onClick={close}
                      variant="secondary"
                      className="flex-auto"
                      disabled={fetcher.state === 'submitting'}
                    >
                      Cancel
                    </Button>
                    <SubmitButton
                      variant="primary"
                      form={formId}
                      className="flex-auto"
                    >
                      Create
                    </SubmitButton>
                  </div>
                </div>
              </DialogFooter>
            </fetcher.Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
