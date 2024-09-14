import { Form } from '@remix-run/react';
import {
  useListDeployments,
  useRegisterDeployment,
} from '@restate/data-access/admin-api';
import { Button, SubmitButton } from '@restate/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  useDialog,
} from '@restate/ui/dialog';
import { FormFieldCheckbox, FormFieldInput } from '@restate/ui/form-field';
import { Icon, IconName } from '@restate/ui/icons';
import { FormEvent, PropsWithChildren, useId, useState } from 'react';
import { Nav, NavButtonItem } from '@restate/ui/nav';
import { ErrorBanner } from '@restate/ui/error';

function RegistrationFormFields({
  children,
  className = '',
}: PropsWithChildren<{ className?: string }>) {
  const [type, setType] = useState<'uri' | 'arn'>('uri');
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-medium leading-6 text-gray-900">
        Register deployment
      </h3>
      <p className="text-sm text-gray-500">
        Point Restate to your deployed services so Restate can discover and
        register your services and handlers
      </p>
      <div className={`${className} flex flex-col gap-6`}>
        <div className="grid grid-cols-1 grid-rows-1">
          <FormFieldInput
            autoFocus
            required
            name={type}
            className="mt-2  row-start-1 row-end-2 col-start-1 col-end-2 [&_input]:pl-[5rem]"
            placeholder={
              type === 'uri'
                ? 'https://example.com/my-deployment'
                : 'arn:aws:lambda:{reg}:{acc}:function:{func}:{version}'
            }
            label={
              <span slot="description">
                Please provide the endpoint of deployment
              </span>
            }
          />
          <div className="w-fit row-start-1 row-end-2 col-start-1 col-end-2 self-start mt-[2.23rem] ml-[0.1rem] [&_ul]:bg-black/[0.025] [&_button]:px-2 [&_.active]:px-2 [&_ul]:rounded-[0.35rem] [&_button]:rounded-[0.35rem] [&_.active]:rounded-[0.35rem]">
            <Nav
              ariaCurrentValue="true"
              className="gap-0 row-start-1 row-end-1 "
            >
              <NavButtonItem
                isActive={type === 'uri'}
                onClick={() => setType('uri')}
              >
                <Icon name={IconName.Http} />
              </NavButtonItem>
              <NavButtonItem
                isActive={type === 'arn'}
                onClick={() => setType('arn')}
              >
                <Icon name={IconName.Lambda} />
              </NavButtonItem>
            </Nav>
          </div>
        </div>
        <FormFieldCheckbox
          name="force"
          className="self-baseline mt-0.5"
          value="true"
        >
          <span slot="title" className="text-sm">
            Override existing deployments with the same URI
          </span>
          <br />
          <span slot="description" className="text-sm text-gray-500">
            May cause errors in active invocations.
          </span>
        </FormFieldCheckbox>
      </div>
      {children}
    </div>
  );
}

function RegistrationForm() {
  const formId = useId();
  const { close } = useDialog();
  const { refetch } = useListDeployments();
  const [isDryRun, setIsDryRun] = useState(true);
  const { mutate, isPending, error, data, reset } = useRegisterDeployment({
    onSuccess: (data, variables) => {
      setIsDryRun(false);
      if (variables.body?.dry_run === false) {
        refetch();
        close();
        reset();
      }
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    reset();
    const formData = new FormData(event.currentTarget);
    const uri = String(formData.get('uri'));
    const force = formData.get('force') === 'true';

    mutate({
      body: {
        uri,
        force,
        dry_run: isDryRun,
        additional_headers: {},
      },
    });
  }

  return (
    <DialogContent className="max-w-lg">
      <Form
        id={formId}
        onSubmit={handleSubmit}
        method="post"
        action="/deployments"
      >
        <RegistrationFormFields className={isDryRun ? '' : 'hidden'}>
          {!isDryRun && data?.services && (
            <pre className="whitespace-break-spaces">
              <code>{JSON.stringify(data?.services, null, 4)}</code>
            </pre>
          )}
        </RegistrationFormFields>
        <DialogFooter>
          <div className="flex gap-2 flex-col">
            {error && <ErrorBanner errors={[error]} />}
            <div className="flex gap-2">
              {isDryRun ? (
                <DialogClose>
                  <Button
                    variant="secondary"
                    className="flex-auto"
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                </DialogClose>
              ) : (
                <Button
                  variant="secondary"
                  className="flex-auto"
                  disabled={isPending}
                  onClick={() => {
                    setIsDryRun(true);
                    reset();
                  }}
                >
                  Back
                </Button>
              )}
              <SubmitButton
                variant="primary"
                form={formId}
                className="flex-auto"
              >
                {isDryRun ? 'Next' : 'Confirm'}
              </SubmitButton>
            </div>
          </div>
        </DialogFooter>
      </Form>
    </DialogContent>
  );
}

export function RegisterDeployment({
  children = 'Register deployment',
}: PropsWithChildren<NonNullable<unknown>>) {
  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="secondary" className="flex gap-2 items-center px-3">
          <Icon name={IconName.Plus} />
          {children}
        </Button>
      </DialogTrigger>
      <RegistrationForm />
    </Dialog>
  );
}
