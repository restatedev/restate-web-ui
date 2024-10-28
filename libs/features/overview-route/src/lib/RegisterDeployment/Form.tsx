import { FormFieldInput } from '@restate/ui/form-field';
import { Icon, IconName } from '@restate/ui/icons';
import { PropsWithChildren } from 'react';
import { Radio } from 'react-aria-components';
import { RadioGroup } from '@restate/ui/radio-group';
import { RegisterDeploymentResults } from './Results';
import { AdditionalHeaders } from '../RegisterDeployment/AdditionalHeaders';
import { UseHTTP11 } from '../RegisterDeployment/UseHTTP11';
import { AssumeARNRole } from '../RegisterDeployment/AssumeARNRole';
import { useRegisterDeploymentContext } from './Context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui/tooltip';

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

export function RegistrationForm() {
  const { isEndpoint, isAdvanced, isConfirm } = useRegisterDeploymentContext();

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-medium leading-6 text-gray-900">
        Register deployment
      </h3>
      <p className="text-sm text-gray-500">
        Point Restate to your deployed services so Restate can discover and
        register your services and handlers
      </p>
      {isEndpoint && <EndpointForm />}
      {isAdvanced && <AdvancedForm />}
      {isConfirm && <RegisterDeploymentResults />}
    </div>
  );
}

function EndpointForm() {
  const { isLambda, updateEndpoint, endpoint, isPending } =
    useRegisterDeploymentContext();
  return (
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
      className="[&_.error]:absolute [&_input:not([type=radio])]:absolute left-0 right-0 my-2 [&_input:not([type=radio])]:pr-[4.75rem]"
      placeholder={
        isLambda
          ? 'arn:aws:lambda:{reg}:{acc}:function:{func}:{version}'
          : 'http://localhost:9080'
      }
      label={
        <span slot="description" className="leading-5 text-code block">
          Please specify the HTTP endpoint or Lambda identifier:
        </span>
      }
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
