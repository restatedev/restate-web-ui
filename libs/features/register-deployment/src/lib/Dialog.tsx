import { Button, SubmitButton } from '@restate/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  QueryDialog,
} from '@restate/ui/dialog';
import { Icon, IconName } from '@restate/ui/icons';
import { ComponentProps, PropsWithChildren } from 'react';
import { ErrorBanner } from '@restate/ui/error';
import { RegistrationForm, UpdateForm } from './Form';
import { REGISTER_DEPLOYMENT_QUERY, UPDATE_DEPLOYMENT_QUERY } from './constant';
import { Link } from '@restate/ui/link';
import {
  DeploymentRegistrationState,
  useRegisterDeploymentContext,
} from './Context';
import { tv } from '@restate/util/styles';
import { useRestateContext } from '@restate/features/restate-context';
import { ONBOARDING_QUERY_PARAM } from '@restate/util/feature-flag';
import { FixHttp1 } from './FixHttp1';
import { useSearchParams } from 'react-router';
import { useListDeployments } from '@restate/data-access/admin-api-hooks';
import {
  getEndpoint,
  isLambdaDeployment,
} from '@restate/data-access/admin-api';

const submitButtonStyles = tv({
  base: 'flex gap-1 pr-3.5',
  variants: {
    isOnboarding: { true: '[&:not(:disabled)]:animate-pulseButton', false: '' },
  },
});

function RegisterDeploymentFooter({
  showAdvanced = true,
}: {
  showAdvanced?: boolean;
}) {
  const {
    isAdvanced,
    isEndpoint,
    isConfirm,
    isPending,
    goToEndpoint,
    error,
    formId,
    canSkipAdvanced,
    isOnboarding,
    isHttp1Error,
    endpoint,
    isBreakingChangeError,
  } = useRegisterDeploymentContext();
  return (
    <DialogFooter>
      <div className="flex flex-col gap-2">
        {error && !isHttp1Error && !isBreakingChangeError && (
          <ErrorBanner error={error} />
        )}
        {isHttp1Error && <FixHttp1 formId={formId} endpoint={endpoint} />}
        <div className="flex gap-2">
          <DialogClose>
            <Button variant="secondary" disabled={isPending}>
              Close
            </Button>
          </DialogClose>
          <div className="flex flex-auto flex-row-reverse gap-2">
            {(isEndpoint || isAdvanced) && (
              <SubmitButton
                variant="primary"
                form={formId}
                className={submitButtonStyles({ isOnboarding })}
                name="_action"
                value={canSkipAdvanced || isAdvanced ? 'dryRun' : 'advanced'}
                autoFocus={isOnboarding}
              >
                Next
                <Icon name={IconName.ChevronRight} className="w-[1.25em]" />
              </SubmitButton>
            )}
            {isConfirm && (
              <SubmitButton
                variant="primary"
                form={formId}
                name="_action"
                value="register"
                autoFocus
                className={submitButtonStyles({ isOnboarding })}
              >
                Confirm
              </SubmitButton>
            )}
            {isEndpoint && canSkipAdvanced && !isOnboarding && showAdvanced && (
              <SubmitButton
                variant="secondary"
                disabled={isPending}
                name="_action"
                value="advanced"
                form={formId}
                hideSpinner
                className={submitButtonStyles({ isOnboarding: false })}
              >
                Advanced
                <Icon name={IconName.ChevronRight} className="w-[1.25em]" />
              </SubmitButton>
            )}
            {(isAdvanced || isConfirm) && (
              <Button
                variant="secondary"
                disabled={isPending}
                onClick={goToEndpoint}
                className="flex gap-1 pl-3.5"
              >
                <Icon name={IconName.ChevronLeft} className="w-[1.25em]" />
                Back
              </Button>
            )}
          </div>
        </div>
      </div>
    </DialogFooter>
  );
}

const triggerStyles = tv({
  base: 'flex items-center gap-2 px-3 disabled:cursor-progress',
});

export function TriggerRegisterDeploymentDialog({
  children = 'Register deployment',
  variant = 'secondary-button',
  className,
}: PropsWithChildren<{
  variant?: ComponentProps<typeof Link>['variant'];
  className?: string;
}>) {
  const { status } = useRestateContext();
  return (
    <Link
      variant={variant}
      className={triggerStyles({ className })}
      href={`?${REGISTER_DEPLOYMENT_QUERY}=true`}
      disabled={status === 'PENDING'}
    >
      <Icon name={IconName.Plus} className="h-4 w-4" />
      {children}
    </Link>
  );
}

function removeOnboarding(prev: URLSearchParams) {
  prev.delete(ONBOARDING_QUERY_PARAM);
  return prev;
}

export function RegisterDeploymentDialog() {
  const [searchParams] = useSearchParams();
  return (
    <QueryDialog
      query={REGISTER_DEPLOYMENT_QUERY}
      onCloseQueryParam={removeOnboarding}
    >
      <DialogContent className="max-w-3xl">
        <DeploymentRegistrationState
          mode="register"
          initialEndpoint={
            searchParams?.get(REGISTER_DEPLOYMENT_QUERY) || undefined
          }
        >
          <RegistrationForm />
          <RegisterDeploymentFooter />
        </DeploymentRegistrationState>
      </DialogContent>
    </QueryDialog>
  );
}

export function UpdateDeploymentDialog() {
  const [searchParams] = useSearchParams();
  const deploymentId = searchParams?.get(UPDATE_DEPLOYMENT_QUERY);

  const { data } = useListDeployments();
  const deployment = deploymentId
    ? data?.deployments.get(deploymentId)
    : undefined;
  const endpoint = getEndpoint(deployment);
  return (
    <QueryDialog query={UPDATE_DEPLOYMENT_QUERY}>
      <DialogContent className="max-w-3xl">
        <DeploymentRegistrationState
          initialEndpoint={endpoint}
          mode="update"
          additionalHeaders={deployment?.additional_headers}
          initialAssumeRoleArn={
            deployment && isLambdaDeployment(deployment)
              ? deployment.assume_role_arn || undefined
              : undefined
          }
        >
          <UpdateForm />
          <RegisterDeploymentFooter showAdvanced={false} />
        </DeploymentRegistrationState>
      </DialogContent>
    </QueryDialog>
  );
}
