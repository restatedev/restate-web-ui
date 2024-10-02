import { useSearchParams } from '@remix-run/react';
import { Button, SubmitButton } from '@restate/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@restate/ui/dialog';
import { useId, useEffect, useCallback } from 'react';
import { DELETE_API_KEY_PARAM_NAME } from './constants';
import { FormFieldInput } from '@restate/ui/form-field';
import {
  useAccountParam,
  useEnvironmentParam,
} from '@restate/features/cloud/routes-utils';
import { useFetcherWithError } from '@restate/util/remix';
import { ErrorBanner } from '@restate/ui/error';
import { useQueryClient } from '@tanstack/react-query';

export function DeleteAPIKey() {
  const formId = useId();
  const accountId = useAccountParam();
  const environmentId = useEnvironmentParam();
  const [searchParams, setSearchParams] = useSearchParams();
  const action = `/api/accounts/${accountId}/environments/${environmentId}/keys/${searchParams.get(
    DELETE_API_KEY_PARAM_NAME
  )}`;
  const fetcher = useFetcherWithError({ key: action });
  const shouldShowDeleteApiKey = Boolean(
    environmentId && accountId && searchParams.has(DELETE_API_KEY_PARAM_NAME)
  );
  const close = useCallback(() => {
    setSearchParams(
      (perv) => {
        perv.delete(DELETE_API_KEY_PARAM_NAME);
        return perv;
      },
      { preventScrollReset: true }
    );
    fetcher.resetErrors();
  }, [fetcher, setSearchParams]);

  const queryClient = useQueryClient();
  useEffect(() => {
    if (fetcher.data) {
      queryClient.invalidateQueries({
        queryKey: [
          'describeEnvironment',
          `/api/accounts/${accountId}/environments/${environmentId}`,
        ],
      });
      close();
    }
  }, [fetcher, environmentId, accountId, queryClient, close]);

  return (
    <Dialog
      open={shouldShowDeleteApiKey}
      onOpenChange={(isOpen) => {
        if (!isOpen && shouldShowDeleteApiKey) {
          close();
        }
      }}
    >
      <DialogContent>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Confirm API key deletion
          </h3>
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this API key? Deleting it will
            permanently remove access to the associated services and{' '}
            <span className="font-medium">cannot be undone</span>.
          </p>
          <fetcher.Form
            id={formId}
            method="DELETE"
            action={action}
            name="deleteApiKey"
          >
            <input hidden defaultValue="deleteApiKey" name="_action" />
            <input
              hidden
              defaultValue={String(searchParams.get(DELETE_API_KEY_PARAM_NAME))}
              name="keyId"
            />
            <p className="text-sm text-gray-500 mt-2">
              Please confirm to proceed or cancel to keep the API key.
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
