import { FormFieldCheckbox, FormFieldInput } from '@restate/ui/form-field';
import { Icon, IconName } from '@restate/ui/icons';
import { PropsWithChildren, ReactNode } from 'react';
import { Radio } from 'react-aria-components';
import { RadioGroup } from '@restate/ui/radio-group';
import { RegisterDeploymentResults } from './Results';
import { AdditionalHeaders } from '../RegisterDeployment/AdditionalHeaders';
import { UseHTTP11 } from '../RegisterDeployment/UseHTTP11';
import { AssumeARNRole } from '../RegisterDeployment/AssumeARNRole';
import { useRegisterDeploymentContext } from './Context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui/tooltip';
import { ServiceDeploymentExplainer } from '@restate/features/explainers';

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
      className={({
        isFocusVisible,
        isSelected,
        isPressed,
        isDisabled,
      }) => `${className}
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
        ${isDisabled ? 'opacity-50' : ''}
      `}
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
      <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
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
          description="Please provide the HTTP endpoint or Lambda ARN where your service is running:"
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
          description="Please confirm the list of services discovered in the deployment."
        >
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
        value={endpoint}
        disabled={isPending}
        type={isLambda ? 'text' : 'url'}
        {...(isLambda && {
          pattern:
            '^arn:aws:lambda:[a-z0-9\\-]+:\\d+:function:[a-zA-Z0-9\\-_]+:\\d+$',
        })}
        name="endpoint"
        className="[&_.error]:absolute [&_.error]:pt-1 [&_input:not([type=radio])]:absolute left-0 right-0 my-2 [&_input:not([type=radio])]:pr-[4.75rem]"
        placeholder={
          isLambda
            ? 'arn:aws:lambda:{reg}:{acc}:function:{func}:{version}'
            : 'http://localhost:9080'
        }
        label={isLambda ? 'Lambda ARN' : 'HTTP endpoint'}
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
        <div className="w-fit top-[2px] absolute right-[2px] self-start [&_ul]:bg-black/[0.025] [&_button]:px-2 [&_.active]:px-2 [&_ul]:rounded-[0.35rem] [&_button]:rounded-[0.35rem] [&_.active]:rounded-[0.35rem]">
          <RadioGroup
            value={String(isLambda)}
            name="isLambda"
            required
            className="h-full row-start-1 row-end-1 flex-row gap-[2px] bg-black2/[0.05] rounded-lg"
            onChange={(value) =>
              updateEndpoint?.({
                isLambda: value === 'true',
                endpoint: '',
              })
            }
            disabled={isPending}
          >
            <Tooltip>
              <TooltipTrigger>
                <CustomRadio
                  value="false"
                  className="p-1.5 aspect-square items-center rounded-[0.4rem]"
                >
                  <Icon name={IconName.Http} className="h-4 w-4" />
                </CustomRadio>
              </TooltipTrigger>
              <TooltipContent small offset={20}>
                HTTP endpoint
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <CustomRadio
                  value="true"
                  className="p-1.5 aspect-square items-center rounded-[0.4rem]"
                >
                  <Icon name={IconName.Lambda} className="h-4 w-4" />
                </CustomRadio>
              </TooltipTrigger>
              <TooltipContent small offset={20}>
                AWS Lambda
              </TooltipContent>
            </Tooltip>
          </RadioGroup>
        </div>
      </FormFieldInput>
      {isDuplicate && (
        <div className="rounded-xl bg-orange-100 p-3">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 self-baseline">
              <Icon
                className="h-5 w-5  text-orange-600"
                name={IconName.TriangleAlert}
              />
            </div>

            <FormFieldCheckbox
              name="force"
              className="self-baseline mt2-0.5 text-inherit bg-white"
              value="true"
              checked={shouldForce}
              onChange={updateShouldForce}
              required={isDuplicate}
              direction="right"
              autoFocus
            >
              <div slot="title" className="text-orange-700">
                Override existing deployments
              </div>
              <span
                slot="description"
                className="leading-5 text-sm mt-2 block text-orange-600"
              >
                An existing deployment with the same {isLambda ? 'ARN' : 'URL'}{' '}
                already exists. Would you like to override it?
                <br />
                Please note that this may cause{' '}
                <strong>unrecoverable errors</strong> in active invocations.
              </span>
            </FormFieldCheckbox>
          </div>
        </div>
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
