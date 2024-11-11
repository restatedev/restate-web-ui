import { Button, SubmitButton } from '@restate/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  QueryDialog,
} from '@restate/ui/dialog';
import { Icon, IconName } from '@restate/ui/icons';
import { PropsWithChildren } from 'react';
import { ErrorBanner } from '@restate/ui/error';
import { RegistrationForm } from './Form';
import { REGISTER_DEPLOYMENT_QUERY } from './constant';
import { Link } from '@restate/ui/link';
import {
  DeploymentRegistrationState,
  useRegisterDeploymentContext,
} from './Context';

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
  } = useRegisterDeploymentContext();
  return (
    <DialogFooter>
      <div className="flex gap-2 flex-col">
        {error && <ErrorBanner errors={[error]} />}
        <div className="flex gap-2">
          <DialogClose>
            <Button variant="secondary" disabled={isPending}>
              Cancel
            </Button>
          </DialogClose>
          <div className="flex-auto flex flex-row-reverse gap-2">
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
            {isEndpoint && canSkipAdvanced && (
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

export function TriggerRegisterDeploymentDialog({
  children = 'Register deployment',
}: PropsWithChildren<NonNullable<unknown>>) {
  return (
    <QueryDialog query={REGISTER_DEPLOYMENT_QUERY}>
      <DialogTrigger>
        <Link
          variant="secondary-button"
          className="flex gap-2 items-center px-3"
          href={`?${REGISTER_DEPLOYMENT_QUERY}=true`}
        >
          <Icon name={IconName.Plus} />
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
