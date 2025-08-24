import {
  FormFieldCheckbox,
  FormFieldInput,
  FormFieldLabel,
} from '@restate/ui/form-field';
import { Icon, IconName } from '@restate/ui/icons';
import { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import { Radio } from 'react-aria-components';
import { RadioGroup } from '@restate/ui/radio-group';
import { DeploymentProtocolCheck, RegisterDeploymentResults } from './Results';
import { AdditionalHeaders } from './AdditionalHeaders';
import { UseHTTP11 } from './UseHTTP11';
import { AssumeARNRole } from './AssumeARNRole';
import { useRegisterDeploymentContext } from './Context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui/tooltip';
import { ServiceDeploymentExplainer } from '@restate/features/explainers';

function CustomRadio({
  value,
  children,
  className,
  ...props
}: PropsWithChildren<
  {
    value: string;
    className?: string;
  } & Pick<ComponentProps<typeof Radio>, 'aria-label'>
>) {
  return (
    <Radio
      {...props}
      value={value}
      className={({ isFocusVisible, isSelected, isPressed, isDisabled }) =>
        `${className} group relative flex cursor-default rounded-lg border bg-clip-padding shadow-none outline-hidden ${
          isFocusVisible
            ? 'ring-2 ring-blue-600 ring-offset-1 ring-offset-white/80'
            : ''
        } ${
          isSelected
            ? `${
                isPressed ? 'bg-gray-50' : 'bg-white'
              } z-10 scale-105 border text-gray-800 shadow-xs`
            : 'border-transparent text-gray-500'
        } ${isPressed && !isSelected ? 'bg-gray-100' : ''} ${!isSelected && !isPressed ? 'bg-white/50' : ''} ${isDisabled ? 'opacity-50' : ''} `
      }
    >
      {children}
    </Radio>
  );
}

function Container({
  title,
  description,
  children,
}: PropsWithChildren<{
  title: ReactNode;
  description?: ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
      {description ? (
        <p className="text-sm text-gray-500">{description}</p>
      ) : (
        <div className="mt-2" />
      )}
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

export function RegistrationForm() {
  const { isEndpoint, isAdvanced, isConfirm } = useRegisterDeploymentContext();

  return (
    <>
      {isEndpoint && (
        <Container
          title={
            <>
              Register{' '}
              <ServiceDeploymentExplainer className="decoration-gray-400">
                service deployment
              </ServiceDeploymentExplainer>
            </>
          }
          description="Please provide the HTTP endpoint or Lambda function version ARN where your service is running:"
        >
          <EndpointForm />
        </Container>
      )}
      {isAdvanced && (
        <Container title="Advanced configurations">
          <AdvancedForm />
        </Container>
      )}
      {isConfirm && (
        <Container
          title="Services"
          description="Please confirm the list of registered services in this deployment."
        >
          <DeploymentProtocolCheck />
          <RegisterDeploymentResults />
        </Container>
      )}
    </>
  );
}

function EndpointForm() {
  const {
    isLambda,
    updateEndpoint,
    endpoint,
    isPending,
    isDuplicate,
    shouldForce,
    updateShouldForce,
  } = useRegisterDeploymentContext();
  return (
    <>
      <FormFieldInput
        autoFocus
        required
        autoComplete="url"
        value={endpoint}
        disabled={isPending}
        type={isLambda ? 'text' : 'url'}
        {...(isLambda && {
          pattern:
            '^arn:aws:lambda:[a-z0-9\\-]+:\\d+:function:[a-zA-Z0-9\\-_]+:.+$',
        })}
        name="endpoint"
        className="right-0 left-0 my-2 [&_.error]:absolute [&_.error]:pt-1 [&_input:not([type=radio])]:absolute [&_input:not([type=radio])]:pr-19"
        placeholder={
          isLambda
            ? 'arn:aws:lambda:{region}:{account}:function:{function-name}:{version}'
            : 'http://localhost:9080'
        }
        label={isLambda ? 'Lambda ARN' : 'HTTP endpoint'}
        onKeyDown={(e) => {
          if (e.key === 'Tab' && !isLambda && !endpoint) {
            updateEndpoint?.({
              isLambda: false,
              endpoint: 'http://localhost:9080',
            });
            e.preventDefault();
          }
        }}
        onChange={(value) => {
          updateEndpoint?.({
            isLambda: value.startsWith('arn')
              ? true
              : value.startsWith('http')
                ? false
                : isLambda,
            endpoint: value,
          });
        }}
      >
        <div className="absolute top-[2px] right-[2px] w-fit self-start [&_.active]:rounded-[0.35rem] [&_.active]:px-2 [&_button]:rounded-[0.35rem] [&_button]:px-2 [&_ul]:rounded-[0.35rem] [&_ul]:bg-black/2.5">
          <RadioGroup
            value={String(isLambda)}
            name="isLambda"
            required
            className="bg-black2/[0.05] row-start-1 row-end-1 h-full flex-row gap-[2px] rounded-lg"
            onChange={(value) =>
              updateEndpoint?.({
                isLambda: value === 'true',
                endpoint: '',
              })
            }
            disabled={isPending}
          >
            <FormFieldLabel className="sr-only w-px">
              Endpoint type
            </FormFieldLabel>
            <Tooltip>
              <TooltipTrigger>
                <CustomRadio
                  value="false"
                  className="aspect-square items-center rounded-[0.4rem] p-1.5"
                  aria-label="Http endpoint"
                >
                  <Icon name={IconName.Http} className="h-4 w-4" />
                </CustomRadio>
              </TooltipTrigger>
              <TooltipContent size="sm" offset={20}>
                HTTP endpoint
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <CustomRadio
                  value="true"
                  className="aspect-square items-center rounded-[0.4rem] p-1.5"
                  aria-label="AWS lambda"
                >
                  <Icon name={IconName.Lambda} className="h-4 w-4" />
                </CustomRadio>
              </TooltipTrigger>
              <TooltipContent size="sm" offset={20}>
                AWS Lambda
              </TooltipContent>
            </Tooltip>
          </RadioGroup>
        </div>
      </FormFieldInput>
      {isDuplicate && (
        <FormFieldCheckbox
          name="force"
          className="relative mb-2 rounded-xl bg-orange-100 p-3 [&_.error]:absolute [&_.error]:bottom-[-1.5em] [&_input]:bg-white"
          value="true"
          checked={shouldForce}
          onChange={updateShouldForce}
          required={isDuplicate}
          direction="right"
          autoFocus
        >
          <div
            slot="title"
            className="flex items-center gap-2 text-sm font-semibold text-orange-600"
          >
            <Icon
              className="h-5 w-5 fill-orange-600 text-orange-100"
              name={IconName.TriangleAlert}
            />
            Override existing deployments
          </div>

          <span
            slot="description"
            className="mt-2 block pl-7 text-0.5xs leading-5 text-orange-600"
          >
            An existing deployment with the same {isLambda ? 'ARN' : 'URL'}{' '}
            already exists. Would you like to override it? Please note that this
            may cause{' '}
            <strong className="font-semibold">unrecoverable errors</strong> in
            active invocations.
          </span>
        </FormFieldCheckbox>
      )}
    </>
  );
}

function AdvancedForm() {
  const { isLambda } = useRegisterDeploymentContext();

  return (
    <>
      {isLambda ? <AssumeARNRole /> : <UseHTTP11 />}
      <AdditionalHeaders />
    </>
  );
}
