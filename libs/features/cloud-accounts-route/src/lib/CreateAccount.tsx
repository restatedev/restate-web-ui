import { useSearchParams } from '@remix-run/react';
import { Button, SubmitButton } from '@restate/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@restate/ui/dialog';
import { useId } from 'react';
import { CREATE_ACCOUNT_PARAM_NAME } from './constants';
import { FormFieldInput } from '@restate/ui/form-field';
import { useFetcherWithError } from '@restate/util/remix';
import { clientAction } from './action';
import { ErrorBanner } from '@restate/ui/error';

export function CreateAccount() {
  const action = '/accounts';
  const fetcher = useFetcherWithError<typeof clientAction>({ key: action });
  const formId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldShowCreateAccount =
    searchParams.get(CREATE_ACCOUNT_PARAM_NAME) === 'true';
  const close = () => {
    setSearchParams(
      (perv) => {
        perv.delete(CREATE_ACCOUNT_PARAM_NAME);
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
            Create account
          </h3>
          <p className="text-sm text-gray-500">
            A Restate Cloud account enables you to control resources, users, and
            permissions.
          </p>
          <fetcher.Form id={formId} method="POST" action={action}>
            <p className="text-sm text-gray-500 mt-1">
              Please provide a name for your new account.
            </p>
            <FormFieldInput
              autoFocus
              required
              name="name"
              className="mt-2"
              placeholder="Name"
              pattern="[a-z0-9][a-z0-9\-]{0,61}[a-z0-9]"
            />
            <p className="text-xs text-gray-500 mt-2">
              Choose a DNS-compatible name: lowercase letters, numbers, and
              hyphens only. Must start/end with a letter or number (3-63
              characters).
            </p>
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
      </DialogContent>
    </Dialog>
  );
}
