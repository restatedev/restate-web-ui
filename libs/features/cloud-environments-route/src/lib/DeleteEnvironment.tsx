import { useSearchParams } from '@remix-run/react';
import { Button, SubmitButton } from '@restate/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@restate/ui/dialog';
import { useId } from 'react';
import { DELETE_ENVIRONMENT_PARAM_NAME } from './constants';
import { FormFieldInput } from '@restate/ui/form-field';
import {
  useAccountParam,
  useEnvironmentParam,
} from '@restate/features/cloud/routes-utils';
import { useFetcherWithError } from '@restate/util/remix';
import { ErrorBanner } from '@restate/ui/error';

export function DeleteEnvironment() {
  const formId = useId();
  const accountId = useAccountParam();
  const action = `/accounts/${accountId}/environments`;
  const fetcher = useFetcherWithError({ key: action });
  const environmentId = useEnvironmentParam();
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldShowCreateAccount = Boolean(
    environmentId && searchParams.get(DELETE_ENVIRONMENT_PARAM_NAME) === 'true'
  );
  const close = () => {
    setSearchParams(
      (perv) => {
        perv.delete(DELETE_ENVIRONMENT_PARAM_NAME);
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
            Confirm environment deletion
          </h3>
          <p className="text-sm text-gray-500">
            Deleting this environment will permanently erase all associated
            data, configurations, and resources. This action{' '}
            <span className="font-medium">cannot be undone</span>.
          </p>
          <fetcher.Form
            id={formId}
            method="DELETE"
            action={action}
            name="deleteEnvironment"
          >
            <input name="environmentId" type="hidden" value={environmentId} />
            <p className="text-sm text-gray-500 mt-2">
              Please confirm to proceed or cancel to keep the environment.
            </p>
            <FormFieldInput
              autoFocus
              required
              pattern="delete"
              name="confirm"
              className="mt-2"
              placeholder='Type "delete" to confirm'
              errorMessage={(errors) => {
                const isMisMatch =
                  errors.validationDetails.patternMismatch &&
                  !errors.validationDetails.valueMissing;
                if (isMisMatch) {
                  return 'Type "delete" to confirm';
                }
                return errors.validationErrors;
              }}
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
                    variant="destructive"
                    form={formId}
                    className="flex-auto"
                  >
                    Delete
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
