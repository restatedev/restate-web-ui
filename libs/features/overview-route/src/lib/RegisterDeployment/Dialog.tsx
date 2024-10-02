import { Button, SubmitButton } from '@restate/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from '@restate/ui/dialog';
import { Icon, IconName } from '@restate/ui/icons';
import { PropsWithChildren } from 'react';
import { ErrorBanner } from '@restate/ui/error';
import { RegistrationForm } from './Form';

function RegisterDeploymentFooter({
  isDryRun,
  setIsDryRun,
  error,
  isPending,
  formId,
}: {
  isDryRun: boolean;
  formId: string;
  isPending: boolean;
  setIsDryRun: (value: boolean) => void;
  error?: {
    message: string;
    restate_code?: string | null;
  } | null;
}) {
  return (
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
              }}
            >
              Back
            </Button>
          )}
          <SubmitButton variant="primary" form={formId} className="flex-auto">
            {isDryRun ? 'Next' : 'Confirm'}
          </SubmitButton>
        </div>
      </div>
    </DialogFooter>
  );
}

export function RegisterDeploymentDialog({
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
      <DialogContent className="max-w-lg">
        <RegistrationForm>{RegisterDeploymentFooter}</RegistrationForm>
      </DialogContent>
    </Dialog>
  );
}
