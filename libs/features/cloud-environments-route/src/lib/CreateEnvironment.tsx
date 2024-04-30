import { useFetcher, useSearchParams } from '@remix-run/react';
import { Button, SubmitButton } from '@restate/ui/button';
import { Dialog, DialogContent } from '@restate/ui/dialog';
import { useId } from 'react';
import { CREATE_ENVIRONMENT_PARAM_NAME } from './constants';
import { FormFieldInput } from '@restate/ui/form-field';
import { useAccountParam } from '@restate/features/cloud/utils-routes';

export function CreateEnvironment() {
  const fetcher = useFetcher();
  const formId = useId();
  const accountId = useAccountParam();
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldShowCreateAccount =
    searchParams.get(CREATE_ENVIRONMENT_PARAM_NAME) === 'true';
  const close = () =>
    setSearchParams((perv) => {
      perv.delete(CREATE_ENVIRONMENT_PARAM_NAME);
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
            Create Environment
          </h3>
          <p className="text-sm text-gray-500">
            Please provide a brief description for your new restate Cloud
            environment
          </p>
          <fetcher.Form
            id={formId}
            method="POST"
            action={`/accounts/${accountId}/environments`}
          >
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
