import { Form } from '@remix-run/react';
import {
  useListDeployments,
  useRegisterDeployment,
} from '@restate/data-access/admin-api';
import { useDialog } from '@restate/ui/dialog';
import { FormFieldCheckbox, FormFieldInput } from '@restate/ui/form-field';
import { Icon, IconName } from '@restate/ui/icons';
import {
  FormEvent,
  PropsWithChildren,
  ReactNode,
  useEffect,
  useId,
  useState,
} from 'react';
import { Radio } from 'react-aria-components';
import { RadioGroup } from '@restate/ui/radio-group';
import { RegisterDeploymentResults } from './Results';
import { AdditionalHeaders } from '../RegisterDeployment/AdditionalHeaders';
import { DeploymentType } from '../types';
import { UseHTTP11 } from '../RegisterDeployment/UseHTTP11';
import { AssumeARNRole } from '../RegisterDeployment/AssumeARNRole';

function CustomRadio({
  value,
  children,
  className,
}: PropsWithChildren<{
  value: string;
  className?: string;
}>) {
  return (
    <Radio
      value={value}
      className={({ isFocusVisible, isSelected, isPressed }) => `${className}
        group relative flex cursor-default rounded-lg shadow-none outline-none bg-clip-padding border
        ${
          isFocusVisible
            ? 'ring-2 ring-blue-600 ring-offset-1 ring-offset-white/80'
            : ''
        }
        ${
          isSelected
            ? `${
                isPressed ? 'bg-gray-50' : 'bg-white'
              } border shadow-sm text-gray-800 scale-105 z-10`
            : 'border-transparent text-gray-500'
        }
        ${isPressed && !isSelected ? 'bg-gray-100' : ''}
        ${!isSelected && !isPressed ? 'bg-white/50' : ''}
      `}
    >
      {children}
    </Radio>
  );
}
// TODO: change type on paste
// fix autofocus
function RegistrationFormFields({
  children,
  className = '',
}: PropsWithChildren<{ className?: string }>) {
  const [type, setType] = useState<DeploymentType>('uri');
  const isURI = type === 'uri';
  const isLambda = type === 'arn';

  return (
    <>
      <div className={`${className} flex flex-col gap-2`}>
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Register deployment
        </h3>
        <p className="text-sm text-gray-500">
          Point Restate to your deployed services so Restate can discover and
          register your services and handlers
        </p>
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 grid-rows-1">
            <FormFieldInput
              autoFocus
              {...(type === 'uri' && {
                required: true,
                type: 'url',
              })}
              name="uri"
              className={`${
                type !== 'uri' ? 'hidden' : ''
              } mt-2 row-start-1 row-end-2 col-start-1 col-end-2 [&_input]:pl-[4.75rem]`}
              placeholder="https://example.com/my-deployment"
              label={
                <span slot="description" className="leading-5 text-code block">
                  Please specify the HTTP endpoint or Lambda identifier:
                </span>
              }
            />
            <FormFieldInput
              {...(type === 'arn' && {
                required: true,
                pattern:
                  '^arn:aws:lambda:[a-z0-9\\-]+:\\d+:function:[a-zA-Z0-9\\-_]+:\\d+$',
                type: 'text',
              })}
              name="arn"
              className={`${
                type !== 'arn' ? 'hidden' : ''
              } mt-2 row-start-1 row-end-2 col-start-1 col-end-2 [&_input]:pl-[4.75rem]`}
              placeholder="arn:aws:lambda:{reg}:{acc}:function:{func}:{version}"
              label={
                <span slot="description" className="leading-5 text-code block">
                  Please specify the HTTP endpoint or Lambda identifier:
                </span>
              }
            />
            <div className="w-fit h-[1.925rem] row-start-1 row-end-2 col-start-1 col-end-2 self-start mt-[2.23rem] ml-[0.1rem] [&_ul]:bg-black/[0.025] [&_button]:px-2 [&_.active]:px-2 [&_ul]:rounded-[0.35rem] [&_button]:rounded-[0.35rem] [&_.active]:rounded-[0.35rem]">
              <RadioGroup
                value={type}
                name="type"
                required
                className="h-full row-start-1 row-end-1 flex-row gap-[2px] bg-black2/[0.05] rounded-lg"
                onChange={(value) => setType(value as 'uri' | 'arn')}
              >
                <CustomRadio
                  value="uri"
                  className="p-1.5 aspect-square items-center rounded-[0.4rem]"
                >
                  <Icon name={IconName.Http} className="h-4 w-4" />
                </CustomRadio>
                <CustomRadio
                  value="arn"
                  className="p-1.5 aspect-square items-center rounded-[0.4rem]"
                >
                  <Icon name={IconName.Lambda} className="h-4 w-4" />
                </CustomRadio>
              </RadioGroup>
            </div>
          </div>
          <FormFieldCheckbox
            name="force"
            className="self-baseline mt-0.5"
            value="true"
            direction="right"
          >
            <span slot="title" className="text-sm font-medium text-gray-700">
              Override existing deployments
            </span>
            <br />
            <span
              slot="description"
              className="leading-5 text-code block text-gray-500"
            >
              If selected, it will override any existing deployment with the
              same URI/identifier, potentially causing unrecoverable errors in
              active invocations.
            </span>
          </FormFieldCheckbox>
          {isURI && <UseHTTP11 />}
          {isLambda && <AssumeARNRole />}
          <AdditionalHeaders />
        </div>
      </div>
      {children}
    </>
  );
}

export function RegistrationForm({
  children,
}: {
  children: (props: {
    isDryRun: boolean;
    isPending: boolean;
    formId: string;
    setIsDryRun: (value: boolean) => void;
    error?: {
      message: string;
      restate_code?: string | null;
    } | null;
  }) => ReactNode;
}) {
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
      }
    },
  });

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const uri = String(formData.get('uri'));
    const arn = String(formData.get('arn'));
    const type = String(formData.get('type'));
    const force = formData.get('force') === 'true';
    const use_http_11 = formData.get('use_http_11') === 'true';
    const assume_role_arn =
      formData.get('assume_role_arn')?.toString() || undefined;
    const keys = formData.getAll('key');
    const values = formData.getAll('value');
    const additional_headers: Record<string, string> = keys.reduce(
      (result, key, index) => {
        const value = values.at(index);
        if (typeof key === 'string' && typeof value === 'string' && key) {
          return { ...result, [key]: value };
        }
        return result;
      },
      {}
    );

    mutate({
      body: {
        ...(type === 'uri' ? { uri, use_http_11 } : { arn, assume_role_arn }),
        force,
        dry_run: isDryRun,
        additional_headers,
      },
    });
  }

  return (
    <Form
      id={formId}
      onSubmit={handleSubmit}
      method="post"
      action="/deployments"
    >
      <RegistrationFormFields className={isDryRun ? '' : 'hidden'}>
        {!isDryRun && data?.services && (
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Deployment <code>{data.id}</code>
            </h3>
            <p className="text-sm text-gray-500">
              Below, you will find the list of services and handlers included in
              this deployment. Please confirm.
            </p>
            <RegisterDeploymentResults services={data.services} />
          </div>
        )}
      </RegistrationFormFields>
      {children({ isDryRun, isPending, setIsDryRun, error, formId })}
    </Form>
  );
}
