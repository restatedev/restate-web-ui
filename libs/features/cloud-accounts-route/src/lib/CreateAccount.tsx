import { useSearchParams } from '@remix-run/react';
import { Button, SubmitButton } from '@restate/ui/button';
import { Dialog, DialogContent } from '@restate/ui/dialog';
import { useId } from 'react';
import { CREATE_ACCOUNT_PARAM_NAME } from './constants';
import { FormFieldInput } from '@restate/ui/form-field';
import { useFetcherWithError } from '@restate/util/remix';
import { clientAction } from './action';

export function CreateAccount() {
  const action = '/accounts';
  const fetcher = useFetcherWithError<typeof clientAction>({ key: action });
  const formId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldShowCreateAccount =
    searchParams.get(CREATE_ACCOUNT_PARAM_NAME) === 'true';
  const close = () => {
    setSearchParams((perv) => {
      perv.delete(CREATE_ACCOUNT_PARAM_NAME);
      return perv;
    });
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
      <DialogContent
        footer={
          <div className="flex gap-2">
            <Button
              onClick={close}
              variant="secondary"
              className="flex-auto"
              disabled={fetcher.state === 'submitting'}
            >
              Cancel
            </Button>
            <SubmitButton variant="primary" form={formId} className="flex-auto">
              Create
            </SubmitButton>
          </div>
        }
      >
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Create account
          </h3>
          <p className="text-sm text-gray-500">
            Please give a short description to initialize your new account on
            the restate Cloud platform.
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
          </fetcher.Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
