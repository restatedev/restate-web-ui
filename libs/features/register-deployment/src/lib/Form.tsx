import {
  FormFieldCheckbox,
  FormFieldInput,
  FormFieldLabel,
} from '@restate/ui/form-field';
import { Icon, IconName } from '@restate/ui/icons';
import {
  ComponentProps,
  KeyboardEvent,
  PropsWithChildren,
  ReactNode,
} from 'react';
import { Radio } from 'react-aria-components';
import { RadioGroup } from '@restate/ui/radio-group';
import {
  DeploymentProtocolCheck,
  RegisterDeploymentResults,
  Warning,
} from './Results';
import { AdditionalHeaders } from './AdditionalHeaders';
import { UseHTTP11 } from './UseHTTP11';
import { AssumeARNRole } from './AssumeARNRole';
import { useRegisterDeploymentContext } from './Context';
import {
  InlineTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@restate/ui/tooltip';
import { ServiceDeploymentExplainer } from '@restate/features/explainers';
import { useRestateContext } from '@restate/features/restate-context';
import { tv } from '@restate/util/styles';
import { FocusScope, useFocusManager } from 'react-aria';
import { addProtocol } from './utils';
import { Helper } from './Helper';
import { OverrideWarning } from './OverrideWarnning';
import { OverrideBreaking } from './OverrideBreaking';
import { Metadata } from './Metadata';
import { Link } from '@restate/ui/link';

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
        `${className} group relative flex cursor-default justify-center rounded-lg border bg-clip-padding shadow-none outline-hidden ${
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
  const { isEndpoint, isAdvanced, isConfirm, endpoint } =
    useRegisterDeploymentContext();
  const { tunnel, OnboardingGuide } = useRestateContext();

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
          description={
            tunnel?.isEnabled
              ? "Please provide your service's HTTP endpoint, Lambda function version ARN, or Restate Tunnel endpoint."
              : "Please provide your service's HTTP endpoint or Lambda function version ARN."
          }
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
      {OnboardingGuide && (
        <OnboardingGuide
          endpoint={endpoint}
          stage={
            isConfirm
              ? 'register-deployment-confirm'
              : 'register-deployment-endpoint'
          }
        />
      )}
    </>
  );
}

export function UpdateForm() {
  const { isEndpoint, isConfirm, isLambda } = useRegisterDeploymentContext();

  return (
    <>
      {isEndpoint && (
        <Container
          title={
            <>
              Update{' '}
              <ServiceDeploymentExplainer className="decoration-gray-400">
                service deployment
              </ServiceDeploymentExplainer>
            </>
          }
          description={'Modify the configuration for this deployment. '}
        >
          <Warning title="Service definitions are not updated">
            This only updates the configuration. To apply code changes or add
            new handlers, you must re-register the deployment.{' '}
            <Link
              href="https://docs.restate.dev/services/versioning#deploying-new-service-versions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-700"
            >
              Learn more.
            </Link>
          </Warning>
          {/* <EndpointForm /> */}
          <div className="mt-2" />
          <AdditionalHeaders />
          {isLambda && <AssumeARNRole className="" />}

          {/* <div className="mt-2">
            <div className="relative mb-2 rounded-xl border border-orange-200 bg-orange-50 [&_.error]:absolute [&_.error]:bottom-[-1.5em]">
              <div className="rounded-t-xl bg-white/60 p-3">
                <FormFieldCheckbox
                  name="force"
                  className="[--checkbox-bg:var(--color-white)] [&_label]:before:absolute [&_label]:before:inset-0 [&_label]:before:content-['']"
                  value="true"
                  checked={shouldForce}
                  onChange={updateShouldForce}
                  autoFocus
                >
                  <div className="flex items-center gap-1 text-0.5xs font-medium text-orange-600">
                    Overwrite existing services
                  </div>
                </FormFieldCheckbox>
              </div>
              <div className="border-t border-orange-200" />
              <p className="flex gap-2 p-3 text-0.5xs font-medium text-orange-600">
                <Icon
                  className="mb-1 inline-block h-5 w-5 shrink-0 fill-orange-600 text-orange-100"
                  name={IconName.TriangleAlert}
                />

                <span className="text-0.5xs font-normal text-orange-500">
                  <span className="font-semibold">Caution: </span>This will
                  replace your current service and handler definitions with
                  whatever is currently exposed at this deployment. This may
                  cause{' '}
                  <strong className="font-medium">breaking changes</strong>.
                </span>
              </p>
            </div>
          </div> */}
        </Container>
      )}
      {isConfirm && (
        <Container
          title="Services"
          description="Please confirm the list of services in this deployment."
        >
          <DeploymentProtocolCheck />
          <RegisterDeploymentResults />
        </Container>
      )}
    </>
  );
}

const inputStyles = tv({
  base: 'flex-auto basis-full transition-all [&_.error]:absolute [&_.error]:pt-2 [&_input]:border-transparent! [&_input]:bg-transparent! [&_input]:shadow-none! [&_input]:ring-transparent! [&_input]:outline-none!',
});
const endpointStyles = tv({
  extend: inputStyles,
  variants: {
    isCliTunnel: {
      false: 'flex-auto basis-full',
      true: 'w-0 min-w-0 grow-0 basis-0',
    },
  },
  defaultVariants: {
    isCliTunnel: false,
  },
});
const tunnelNameStyles = tv({
  extend: inputStyles,
  base: '[&_.error]:max-w-[25ch]',
  variants: {
    isTunnel: {
      true: 'w-auto min-w-0 flex-1 basis-[25ch]',
      false: 'w-0 min-w-0 grow-0 basis-0',
    },
  },
});

export const CLI_TUNNEL_REGEX = /:\d+$/;
function EndpointForm() {
  const {
    tunnelName,
    isTunnel,
    isLambda,
    updateEndpoint,
    endpoint,
    isPending,
    isRegister,
    isOnboarding,
    isUpdate,
  } = useRegisterDeploymentContext();
  const { tunnel } = useRestateContext();

  const focusManager = useFocusManager();
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const input = e.target instanceof HTMLInputElement ? e.target : undefined;

    const atLeft =
      input && input.selectionStart === 0 && input.selectionEnd === 0;

    const atRight =
      input &&
      input.selectionStart === input.value.length &&
      input.selectionEnd === input.value.length;

    switch (e.key) {
      case 'ArrowRight':
        if (atRight && input.name !== 'endpoint') {
          focusManager?.focusNext({ wrap: true });
        }
        break;
      case 'ArrowLeft':
        if (atLeft && input.name !== 'tunnel-name') {
          focusManager?.focusPrevious({ wrap: true });
        }
        break;
    }
  };

  const isCliTunnel = Boolean(isTunnel && tunnelName?.match(CLI_TUNNEL_REGEX));

  return (
    <>
      <div className="mt-2 flex flex-col gap-0 pb-1">
        <FormFieldLabel className="mb-0 pl-0.5">
          {isLambda ? (
            'Lambda ARN'
          ) : isTunnel && tunnel?.isEnabled ? (
            <InlineTooltip
              title="Tunnel"
              variant="indicator-button"
              description="A tunnel lets you securely connect a service running in a private environment to Restate Cloud without exposing it to the public internet. The tunnel client runs alongside your service (for example, in your VPC or Kubernetes cluster) and forwards traffic through Restate Cloud as if your service were inside the cloud environment."
              learnMoreHref="https://docs.restate.dev/cloud/connecting-services#3-run-the-tunnel"
            >
              Tunnel
            </InlineTooltip>
          ) : (
            'HTTP endpoint'
          )}
        </FormFieldLabel>
        <div
          onKeyDownCapture={onKeyDown}
          className="relative my-2 flex rounded-lg border border-gray-200 bg-gray-100 px-0.5 text-sm text-gray-900 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] outline-2 outline-offset-2 outline-transparent has-[input[data-focused=true2]]:outline-blue-500 has-[input[data-focused=true]]:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] has-[input[data-focused=true]]:outline-blue-600"
        >
          <FocusScope>
            <FormFieldInput
              className={tunnelNameStyles({ isTunnel })}
              placeholder="my-tunnel-name"
              required={isTunnel}
              value={tunnelName}
              name="tunnel-name"
              onChange={(value) => {
                updateEndpoint?.({
                  isLambda: false,
                  tunnelName: value,
                  isTunnel: isTunnel,
                  endpoint,
                });
              }}
            />
            {isTunnel && !isCliTunnel && (
              <div className="-my-px h-full min-h-9 w-[2px] shrink-0 bg-white" />
            )}
            <FormFieldInput
              autoFocus={!isOnboarding}
              required={!isCliTunnel && !isUpdate}
              autoComplete="url"
              value={endpoint}
              disabled={isPending}
              readonly={isOnboarding}
              {...(isLambda
                ? {
                    pattern:
                      '^arn:aws:lambda:[a-z0-9\\-]+:\\d+:function:[a-zA-Z0-9\\-_]+:.+$',
                  }
                : {
                    validate: (value) => {
                      try {
                        if (value) {
                          new URL(addProtocol(value));
                          return null;
                        } else {
                          return null;
                        }
                      } catch (error) {
                        return 'Please enter a URL.';
                      }
                    },
                  })}
              name="endpoint"
              className={endpointStyles({ isCliTunnel })}
              placeholder={
                isLambda
                  ? 'arn:aws:lambda:{region}:{account}:function:{function-name}:{version}'
                  : isTunnel
                    ? 'Destination:  http://localhost:9080'
                    : 'http://localhost:9080'
              }
              onKeyDown={(e) => {
                if (e.key === 'Tab' && !isLambda && !isTunnel && !endpoint) {
                  updateEndpoint?.({
                    isLambda: false,
                    isTunnel: false,
                    endpoint: 'http://localhost:9080',
                    tunnelName: '',
                  });
                  e.preventDefault();
                }
              }}
              onChange={(value) => {
                if (value.startsWith('tunnel://')) {
                  updateEndpoint?.({
                    isLambda: false,
                    isTunnel: true,
                    endpoint: undefined,
                    tunnelName: value,
                  });
                  return;
                }
                updateEndpoint?.({
                  isLambda: value.startsWith('arn')
                    ? true
                    : value.startsWith('http')
                      ? false
                      : isLambda,
                  isTunnel: value.startsWith('arn') ? false : isTunnel,
                  endpoint: value,
                  tunnelName,
                });
              }}
            />
          </FocusScope>
          <div className="w-28 shrink-0 py-0.5 [&_.active]:rounded-[0.35rem] [&_.active]:px-2 [&_button]:rounded-[0.35rem] [&_button]:px-2 [&_ul]:rounded-[0.35rem] [&_ul]:bg-black/2.5">
            <RadioGroup
              value={
                isLambda
                  ? 'lambda'
                  : isTunnel && tunnel?.isEnabled
                    ? 'tunnel'
                    : 'http'
              }
              name="name"
              required
              readonly={isOnboarding}
              className="bg-black2/[0.05] row-start-1 row-end-1 h-full flex-row justify-end gap-[2px] rounded-lg"
              onChange={(value) =>
                updateEndpoint?.({
                  isLambda: value === 'lambda',
                  isTunnel: value === 'tunnel',
                  endpoint: '',
                  tunnelName: '',
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
                    value="http"
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
                    value="lambda"
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
              {tunnel?.isEnabled && (
                <Tooltip>
                  <TooltipTrigger>
                    <CustomRadio
                      value="tunnel"
                      className="aspect-square items-center rounded-[0.4rem] p-1.5"
                      aria-label="Tunnel"
                    >
                      <Icon name={IconName.Tunnel} className="h-4 w-4" />
                    </CustomRadio>
                  </TooltipTrigger>
                  <TooltipContent size="sm" offset={20}>
                    Tunnel
                  </TooltipContent>
                </Tooltip>
              )}
            </RadioGroup>
          </div>
        </div>
      </div>
      {isLambda && <AssumeARNRole className="" />}

      {isRegister && (
        <>
          <OverrideWarning />
          <OverrideBreaking />
          <Helper isLambda={isLambda} isTunnel={isTunnel} />
        </>
      )}
    </>
  );
}

function AdvancedForm() {
  const { isLambda } = useRegisterDeploymentContext();

  return (
    <div className="flex flex-col gap-6">
      {isLambda ? null : <UseHTTP11 />}
      <AdditionalHeaders />
      <Metadata />
      <OverrideWarning />
      <OverrideBreaking />
    </div>
  );
}
