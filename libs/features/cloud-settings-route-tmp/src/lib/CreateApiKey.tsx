import { ClientActionFunctionArgs, useSearchParams } from '@remix-run/react';
import { Button, SubmitButton } from '@restate/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@restate/ui/dialog';
import { ReactNode, useCallback, useEffect, useId, useState } from 'react';
import { CREATE_API_KEY_PARAM_NAME } from './constants';
import { FormFieldInput, FormFieldLabel } from '@restate/ui/form-field';
import {
  useAccountParam,
  useEnvironmentParam,
} from '@restate/features/cloud/routes-utils';
import { ErrorBanner } from '@restate/ui/error';
import { useFetcherWithError } from '@restate/util/remix';
import { RadioGroup } from '@restate/ui/radio-group';
import { Icon, IconName } from '@restate/ui/icons';
import { Radio } from 'react-aria-components';
import { Link } from '@restate/ui/link';
import { useQueryClient } from '@tanstack/react-query';
import { components } from '@restate/data-access/cloud/api-client';
import { TypedResponse } from '@remix-run/cloudflare';

// TODO remove type
type Action = ({ request, params }: ClientActionFunctionArgs) => Promise<
  | {
      keyId: string;
      roleId: components['schemas']['RoleId'];
      environmentId: string;
      accountId: string;
      apiKey: string;
      state: 'ACTIVE' | 'DELETED';
    }
  | TypedResponse<never>
  | {
      errors: Error[];
    }
  | null
>;

export function CreateApiKey({ hasAnyKeys }: { hasAnyKeys: boolean }) {
  const formId = useId();
  const [count, setCount] = useState(0);
  const accountId = useAccountParam();
  const environmentId = useEnvironmentParam();
  const action = `/api/accounts/${accountId}/environments/${environmentId}/keys#${count}`;
  const fetcher = useFetcherWithError<Action>({ key: action });
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldShowCreateApiKey =
    searchParams.get(CREATE_API_KEY_PARAM_NAME) === 'true';
  const onClose = useCallback(() => {
    setSearchParams(
      (perv) => {
        perv.delete(CREATE_API_KEY_PARAM_NAME);
        return perv;
      },
      { preventScrollReset: true }
    );

    fetcher.resetErrors();
  }, [fetcher, setSearchParams]);

  const apiKey =
    fetcher.data && 'apiKey' in fetcher.data ? fetcher.data.apiKey : undefined;

  const queryClient = useQueryClient();
  useEffect(() => {
    if (fetcher.data) {
      const data: any = fetcher.data;
      queryClient.setQueryData(
        [
          'describeApiKey',
          `/api/accounts/${accountId}/environments/${environmentId}/keys/${data.keyId}`,
        ],
        data
      );
      queryClient.invalidateQueries({
        queryKey: [
          'describeApiKey',
          `/api/accounts/${accountId}/environments/${environmentId}/keys/${data.keyId}`,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          'describeEnvironment',
          `/api/accounts/${accountId}/environments/${environmentId}`,
        ],
      });
    }
  }, [fetcher, environmentId, accountId, queryClient]);

  const createKeyButton = (
    <Button
      onClick={() => {
        setCount((c) => c + 1);
        setSearchParams(
          (perv) => {
            perv.set(CREATE_API_KEY_PARAM_NAME, 'true');
            return perv;
          },
          { preventScrollReset: true }
        );
      }}
      variant="secondary"
      className="flex gap-2 items-center"
    >
      <Icon name={IconName.Plus} /> Create API Key
    </Button>
  );

  return (
    <Dialog
      open={shouldShowCreateApiKey}
      onOpenChange={(isOpen) => {
        if (!isOpen && shouldShowCreateApiKey) {
          onClose();
        }
      }}
    >
      {hasAnyKeys ? (
        createKeyButton
      ) : (
        <div className="flex flex-col gap-2 items-center relative w-full rounded-xl border border-gray-200 p-8 text-center bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] ">
          <h3 className="text-sm font-semibold text-gray-600">No API Keys</h3>
          <p className="text-sm text-gray-500">
            Get started by creating a new API Key
          </p>
          <div className="mt-4">{createKeyButton}</div>
        </div>
      )}

      <DialogContent className="max-w-md">
        {!apiKey ? (
          <CreateApiForm formId={formId} action={action} onClose={onClose} />
        ) : (
          <CreateApiResult apiKey={apiKey} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CustomRadio({
  value,
  label,
  description,
}: {
  value: string;
  label: string;
  description: ReactNode;
}) {
  return (
    <Radio
      value={value}
      className={({ isFocusVisible, isSelected, isPressed }) => `
      group relative flex cursor-default rounded-lg px-4 py-3 shadow-none outline-none bg-clip-padding border
      ${
        isFocusVisible
          ? 'ring-2 ring-blue-600 ring-offset-1 ring-offset-white/80'
          : ''
      }
      ${
        isSelected
          ? `${
              isPressed ? 'bg-gray-50' : 'bg-white'
            } border shadow-sm text-gray-800`
          : 'border-transparent text-gray-500'
      }
      ${isPressed && !isSelected ? 'bg-gray-100' : ''}
      ${!isSelected && !isPressed ? 'bg-white/50' : ''}
    `}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <div className="text-sm font-medium">{label}</div>
          <div className="inline text-sm font-normal text-gray-500">
            {description}
          </div>
        </div>
        <div className="flex items-center shrink-0 invisible group-selected:visible">
          <Icon name={IconName.Check} />
        </div>
      </div>
    </Radio>
  );
}

function CreateApiForm({
  action,
  formId,
  onClose,
}: {
  action: string;
  formId: string;
  onClose: VoidFunction;
}) {
  const fetcher = useFetcherWithError<Action>({ key: action });

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-medium leading-6 text-gray-900">
        Create API key
      </h3>
      <p className="text-sm text-gray-500">
        API keys serve as long-lived credentials that allow machines to
        programmatically access Restate Cloud environments.
      </p>
      <div>
        <fetcher.Form
          id={formId}
          method="POST"
          action={action}
          className="flex flex-col gap-4"
          name="createApiKey"
        >
          <input hidden defaultValue="createApiKey" name="_action" />
          <div>
            <FormFieldInput
              autoFocus
              required
              name="description"
              className="mt-2"
              placeholder="Description"
              maxLength={100}
              label={
                <span slot="description">
                  Please provide a brief description for your new API Key
                </span>
              }
            />
          </div>
          <RadioGroup name="roleId" required className="mt-2">
            <FormFieldLabel>
              <span slot="title" className="text-base">
                Role
              </span>
              <span slot="description">
                Choose the appropriate role to specify access levels and
                permissions
              </span>
            </FormFieldLabel>
            <div className="flex flex-col gap-1 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] mt-0 bg-gray-100 rounded-lg border border-gray-200 py-1.5 px-1 text-sm text-gray-900">
              <CustomRadio
                value="rst:role::CompleteAwakeableAccess"
                label="Complete Awakeable"
                description={
                  <>
                    Can complete any{' '}
                    <Link
                      href="https://docs.restate.dev/develop/ts/awakeables/"
                      target="_blank"
                      rel="noreferrer noopener"
                      variant="secondary"
                    >
                      awakeables
                    </Link>
                  </>
                }
              />
              <CustomRadio
                value="rst:role::IngressAccess"
                label="Invoke"
                description={
                  <>
                    Can make{' '}
                    <Link
                      href="https://docs.restate.dev/concepts/invocations"
                      target="_blank"
                      rel="noreferrer noopener"
                      variant="secondary"
                    >
                      invocations
                    </Link>
                  </>
                }
              />
              <CustomRadio
                value="rst:role::AdminAccess"
                label="Admin"
                description={
                  <>
                    Has access to{' '}
                    <Link
                      href="https://docs.restate.dev/references/admin-api/"
                      target="_blank"
                      rel="noreferrer noopener"
                      variant="secondary"
                    >
                      Admin operations
                    </Link>
                  </>
                }
              />
              <CustomRadio
                value="rst:role::FullAccess"
                label="Full"
                description={<>Has access to all operations</>}
              />
            </div>
          </RadioGroup>
          <DialogFooter>
            <div className="flex gap-2 flex-col">
              <ErrorBanner errors={fetcher.errors} />
              <div className="flex gap-2">
                <Button
                  onClick={onClose}
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
  );
}

function CreateApiResult({
  apiKey,
  onClose,
}: {
  apiKey: string;
  onClose: VoidFunction;
}) {
  const [isCopied, setIsCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-medium leading-6 text-gray-900">
        Create API key
      </h3>
      <p className="text-sm text-gray-500">
        Your API key has been successfully created. Please ensure you save it in
        a secure location, as this{' '}
        <span className="font-medium">key cannot be retrieved</span> once the
        dialog is closed
      </p>
      <div>
        <div className="flex gap-2 items-start font-mono [overflow-wrap:anywhere] shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] mt-0 bg-gray-100 rounded-lg border border-gray-200 py-1.5 px-2 text-sm text-gray-900">
          {apiKey}
          <Button
            variant="secondary"
            className="flex-shrink-0 flex items-center gap-1"
            onClick={() => {
              navigator.clipboard.writeText(apiKey);
              setIsCopied(true);
              setTimeout(() => {
                setIsCopied(false);
              }, 1000);
            }}
            autoFocus
          >
            <span className="min-w-[5ch] inline-flex justify-center">
              {isCopied ? (
                <Icon name={IconName.Check} className="h-5" />
              ) : (
                'Copy'
              )}
            </span>
          </Button>
        </div>

        <DialogFooter>
          <div className="flex gap-2 flex-col">
            <div className="flex gap-2">
              <Button
                onClick={onClose}
                variant="secondary"
                className="flex-auto"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogFooter>
      </div>
    </div>
  );
}