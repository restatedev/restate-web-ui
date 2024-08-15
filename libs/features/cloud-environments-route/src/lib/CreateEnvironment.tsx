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
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';
import { useQuery } from '@tanstack/react-query';
import invariant from 'tiny-invariant';
import { cloudApi } from '@restate/data-access/cloud/api-client';

const NUMBER_OF_ENVIRONMENT_LIMIT = 2;

export function CreateEnvironment() {
  const formId = useId();
  const accountId = useAccountParam();
  invariant(accountId, 'Account id is missing');
  const { data: environmentList } = useQuery({
    ...cloudApi.listEnvironments({ accountId }),
    refetchOnMount: false,
  });
  const currentNumberOfEnvironments = environmentList?.environments.length ?? 0;
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

  const canCreateEnvironment =
    currentNumberOfEnvironments < NUMBER_OF_ENVIRONMENT_LIMIT;

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
            Creating a Restate Cloud environment is the quickest path to
            securing a dedicated, fully managed Restate instance.
          </p>
          <div>
            <p className="text-sm text-gray-500 mt-4">
              Please provide a name for your new environment.
            </p>
            <fetcher.Form
              id={formId}
              method="POST"
              action={action}
              name="createEnvironment"
            >
              <FormFieldInput
                autoFocus
                required
                name="name"
                className="mt-2"
                placeholder="Name"
                pattern="[a-z0-9][a-z0-9\-]{0,61}[a-z0-9]"
                disabled={!canCreateEnvironment}
              />
              <p className="text-xs text-gray-500 mt-2">
                Choose a DNS-compatible name: lowercase letters, numbers, and
                hyphens only. Must start/end with a letter or number (3-63
                characters).
              </p>
              <DialogFooter>
                <div className="flex gap-2 flex-col">
                  <ErrorBanner errors={fetcher.errors} />
                  {!canCreateEnvironment && (
                    <div className="rounded-xl bg-sky-100 p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0 self-baseline">
                          <Icon
                            className="h-5 w-5  text-sky-600"
                            name={IconName.Wallet}
                          />
                        </div>
                        <output className="text-sm flex-auto text-sky-700">
                          Your current plan offers up to{' '}
                          {NUMBER_OF_ENVIRONMENT_LIMIT} environments. For
                          additional capacity,{' '}
                          <Link
                            target="_blank"
                            href="https://restate.dev/get-restate-cloud/"
                            rel="noreferrer noopener"
                            className="inline"
                          >
                            please register
                          </Link>{' '}
                          for our upcoming premium offerings.
                        </output>
                      </div>
                    </div>
                  )}
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
                      disabled={!canCreateEnvironment}
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
