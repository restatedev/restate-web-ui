import { useFetcher, useSearchParams } from '@remix-run/react';
import { Button, SubmitButton } from '@restate/ui/button';
import { Dialog, DialogClose, DialogContent } from '@restate/ui/dialog';
import { useId } from 'react';
import { CREATE_ACCOUNT_PARAM_NAME } from './constants';
import { FormFieldInput } from '@restate/ui/form-field';

export function CreateAccount() {
  const fetcher = useFetcher();
  const formId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldShowCreateAccount =
    searchParams.get(CREATE_ACCOUNT_PARAM_NAME) === 'true';
  const close = () =>
    setSearchParams((perv) => {
      perv.delete(CREATE_ACCOUNT_PARAM_NAME);
      return perv;
    });

  return (
    <Dialog
      open={shouldShowCreateAccount}
      onOpenChange={(isOpen) => {
        if (!isOpen && shouldShowCreateAccount) {
          close();
        }
      }}
    >
      <DialogContent
        footer={
          <div className="flex gap-2">
            <DialogClose>
              <Button
                onClick={close}
                variant="secondary"
                className="flex-auto"
                disabled={fetcher.state === 'submitting'}
              >
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton variant="primary" form={formId} className="flex-auto">
              Create
            </SubmitButton>
          </div>
        }
      >
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Create Account
          </h3>
          <p className="text-base text-gray-500">
            Create a new account by providing a description to set up your
            dedicated space within restate Cloud platform.
          </p>
          <fetcher.Form id={formId} method="POST" action="/accounts">
            <FormFieldInput
              autoFocus
              required
              name="description"
              className="mt-2"
              placeholder="Description"
            />
          </fetcher.Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
