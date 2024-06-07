import { useSearchParams } from '@remix-run/react';
import {
  useAccountParam,
  useEnvironmentParam,
} from '@restate/features/cloud/routes-utils';
import { Button, SubmitButton } from '@restate/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@restate/ui/dialog';
import { ErrorBanner } from '@restate/ui/error';
import {
  FormFieldInput,
  FormFieldSelect,
  FormFieldTextarea,
  Option,
} from '@restate/ui/form-field';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopover,
} from '@restate/ui/popover';
import { getAccessToken } from '@restate/util/auth';
import { useFetcherWithError } from '@restate/util/remix';
import { useCallback, useEffect, useId, useState } from 'react';
import { Header } from 'react-aria-components';

const SUPPORT_QUERY_PARAM = 'support-ticket';
const SUPPORT_TICKET_ENABLED = false;

export function Support() {
  const [searchParams, setSearchParams] = useSearchParams();
  const iOpen = searchParams.get(SUPPORT_QUERY_PARAM) === 'true';
  const accountId = useAccountParam();
  const environmentId = useEnvironmentParam();
  const formId = useId();
  const [count, setCount] = useState(0);
  const action = `/api/support#${count}`;
  const fetcher = useFetcherWithError({ key: action });

  const close = useCallback(
    () =>
      setSearchParams(
        (perv) => {
          perv.delete(SUPPORT_QUERY_PARAM);
          return perv;
        },
        { preventScrollReset: true }
      ),
    [setSearchParams]
  );

  useEffect(() => {
    if (fetcher.data?.ok && iOpen) {
      close();
    }
  }, [close, fetcher.data?.ok, iOpen]);

  if (!SUPPORT_TICKET_ENABLED) {
    return null;
  }
  return (
    <>
      <Popover>
        <Help />
        <PopoverContent>
          <div className="p-1 pt-0">
            <Header className="text-sm font-semibold text-gray-500 px-4 py-1 pt-2 truncate">
              Do you need help?
            </Header>
            <div className="flex flex-col gap-1">
              <Link
                variant="secondary-button"
                href="https://docs.restate.dev/"
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-2 justify2-center text-code font-medium"
              >
                <Icon
                  name={IconName.Docs}
                  className="w-[1.25em] h-[1.25em] text-gray-700"
                />
                Read documentation…
              </Link>
              <Link
                variant="secondary-button"
                href="https://discord.gg/skW3AZ6uGd"
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-2 justify2-center text-code font-medium"
              >
                <Icon
                  name={IconName.Discord}
                  className="w-[1.25em] h-[1.25em] text-gray-700"
                />
                Join Discord…
              </Link>
              <Link
                variant="secondary-button"
                href="https://github.com/restatedev/restate/issues/new"
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-2 justify2-center text-code font-medium"
              >
                <Icon
                  name={IconName.Github}
                  className="w-[1.25em] h-[1.25em] text-gray-700"
                />
                Open Github issue…
              </Link>
              <SupportFormLink
                onClick={() => {
                  setCount((c) => c + 1);
                  setSearchParams(
                    (perv) => {
                      perv.set(SUPPORT_QUERY_PARAM, 'true');
                      return perv;
                    },
                    { preventScrollReset: true }
                  );
                }}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Dialog
        open={iOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            close();
          }
        }}
      >
        <DialogContent>
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Need help?
            </h3>
            <p className="text-sm text-gray-500 mb-2">
              Experiencing issues with your Restate Cloud environment? Fill out
              the form below to create a support ticket. Our team will review
              your submission and assist you promptly.
            </p>
            <fetcher.Form action={action} method="POST" id={formId}>
              <div className="flex flex-col gap-4">
                <FormFieldInput
                  required
                  name="accountId"
                  className="[&_input]:font-mono [&_input]:text-code"
                  placeholder="Account Id"
                  defaultValue={accountId}
                  readonly
                  label="Account"
                />
                <FormFieldInput
                  required
                  name="environmentId"
                  className="[&_input]:font-mono [&_input]:text-code"
                  placeholder="Environment Id"
                  defaultValue={environmentId}
                  readonly
                  label="Environment"
                />
                <FormFieldSelect
                  label="Issue"
                  placeholder="Select your issue"
                  required
                  autoFocus
                  name="issue"
                >
                  <Option>Performance & reliability</Option>
                  <Option>CLI</Option>
                  <Option>AWS Lambda</Option>
                  <Option>Other</Option>
                </FormFieldSelect>
                <FormFieldTextarea
                  required
                  name="description"
                  className="min-h-[10rem]"
                  placeholder="Description"
                  label={
                    <>
                      <span slot="title">Description</span>
                      <span slot="description">
                        Please describe the issue in detail to help us assist
                        you better.
                      </span>
                    </>
                  }
                />
                <input
                  type="hidden"
                  value={getAccessToken() ?? ''}
                  name="access_token"
                />
              </div>
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
                      Submit
                    </SubmitButton>
                  </div>
                </div>
              </DialogFooter>
            </fetcher.Form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SupportFormLink({ onClick }: { onClick: VoidFunction }) {
  const { close } = usePopover();

  return (
    <Button
      variant="secondary"
      className="flex items-center gap-2 justify2-center text-code font-medium"
      onClick={() => {
        close();
        onClick();
      }}
    >
      <Icon
        name={IconName.SupportTicket}
        className="w-[1.25em] h-[1.25em] text-gray-700"
      />
      Ask for help…
    </Button>
  );
}

function Help() {
  const { isOpen } = usePopover();

  return (
    <PopoverTrigger>
      <Button
        variant="secondary"
        className="fixed p-0 flex items-center justify-center bottom-2 right-2 sm:bottom-4 sm:right-4 rounded-full w-11 h-11 bg-white/80 backdrop-blur-xl backdrop-saturate-200 text-gray-700 shadow-lg shadow-zinc-800/5 z-50  pressed:shadow-sm pressed:scale-95"
      >
        {isOpen ? (
          <Icon name={IconName.X} className="w-5 h-5" />
        ) : (
          <Icon name={IconName.Help} className="w-5 h-5" />
        )}
      </Button>
    </PopoverTrigger>
  );
}
