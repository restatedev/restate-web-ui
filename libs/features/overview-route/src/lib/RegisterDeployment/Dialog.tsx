import { Button, SubmitButton } from '@restate/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  QueryDialog,
} from '@restate/ui/dialog';
import { Icon, IconName } from '@restate/ui/icons';
import { ComponentProps, PropsWithChildren } from 'react';
import { ErrorBanner } from '@restate/ui/error';
import { RegistrationForm } from './Form';
import { REGISTER_DEPLOYMENT_QUERY } from './constant';
import { Link } from '@restate/ui/link';
import {
  DeploymentRegistrationState,
  useRegisterDeploymentContext,
} from './Context';
import { tv } from 'tailwind-variants';

function RegisterDeploymentFooter() {
  const {
    isAdvanced,
    isEndpoint,
    isConfirm,
    isPending,
    goToEndpoint,
    error,
    formId,
    canSkipAdvanced,
    isLambda,
  } = useRegisterDeploymentContext();
  return (
    <DialogFooter>
      <div className="flex flex-col gap-2">
        {error && <ErrorBanner errors={[error]} />}
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
                className="flex gap-1 pr-3.5"
                name="_action"
                value={canSkipAdvanced || isAdvanced ? 'dryRun' : 'advanced'}
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
              >
                Confirm
              </SubmitButton>
            )}
            {isEndpoint && canSkipAdvanced && !isLambda && (
              <SubmitButton
                variant="secondary"
                disabled={isPending}
                name="_action"
                value="advanced"
                form={formId}
                hideSpinner
                className="flex gap-1 pr-3.5"
              >
                Advanced
                <Icon name={IconName.ChevronRight} className="w-[1.25em]" />
              </SubmitButton>
            )}
            {isAdvanced && (
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

const triggerStyles = tv({ base: 'flex items-center gap-2 px-3' });
export function TriggerRegisterDeploymentDialog({
  children = 'Register deployment',
  variant = 'secondary-button',
  className,
}: PropsWithChildren<{
  variant?: ComponentProps<typeof Link>['variant'];
  className?: string;
}>) {
  return (
    <QueryDialog query={REGISTER_DEPLOYMENT_QUERY}>
      <DialogTrigger>
        <Link
          variant={variant}
          className={triggerStyles({ className })}
          href={`?${REGISTER_DEPLOYMENT_QUERY}=true`}
        >
          <Icon name={IconName.Plus} className="h-4 w-4" />
          {children}
        </Link>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DeploymentRegistrationState>
          <RegistrationForm />
          <RegisterDeploymentFooter />
        </DeploymentRegistrationState>
      </DialogContent>
    </QueryDialog>
  );
}
