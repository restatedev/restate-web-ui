import {
  DialogClose,
  DialogContent,
  DialogFooter,
  QueryDialog,
} from '@restate/ui/dialog';
import {
  DELETE_DEPLOYMENT_QUERY_PARAM,
  DEPLOYMENT_QUERY_PARAM,
} from './constants';
import { Form, useSearchParams } from 'react-router';
import { Button, SubmitButton } from '@restate/ui/button';
import { ErrorBanner } from '@restate/ui/error';
import { FormFieldInput } from '@restate/ui/form-field';
import { FormEvent, PropsWithChildren, useId, useState } from 'react';
import { getEndpoint } from '@restate/data-access/admin-api';
import {
  useDeleteDeployment,
  useListDeployments,
} from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { useRestateContext } from '@restate/features/restate-context';
import { ONBOARDING_QUERY_PARAM } from '@restate/util/feature-flag';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import { Link } from '@restate/ui/link';

const warningStyles = tv({
  base: 'flex gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-0.5xs text-orange-600',
});
export function Warning({
  title,
  className,
  children,
}: PropsWithChildren<{ title?: string; className?: string }>) {
  return (
    <p className={warningStyles({ className })}>
      <Icon
        className="h-5 w-5 shrink-0 fill-orange-600 text-orange-100"
        name={IconName.TriangleAlert}
      />
      <span className="inline-block">
        {title && <span className="font-semibold">{title}: </span>}
        {children}
      </span>
    </p>
  );
}

export function DeleteDeployment() {
  const formId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const deploymentId = searchParams.get(DELETE_DEPLOYMENT_QUERY_PARAM);
  const { data, refetch } = useListDeployments();
  const deployment = deploymentId
    ? data?.deployments.get(deploymentId)
    : undefined;

  const [deploymentEndpoint, setDeploymentEndpoint] = useState(
    getEndpoint(deployment),
  );
  const { OnboardingGuide } = useRestateContext();

  if (
    deployment &&
    (!deploymentEndpoint || deploymentEndpoint !== getEndpoint(deployment))
  ) {
    setDeploymentEndpoint(getEndpoint(deployment));
  }
  const { mutate, isPending, error } = useDeleteDeployment(
    String(deploymentId),
    {
      onSuccess(data, variables) {
        setSearchParams(
          (old) => {
            old.delete(DELETE_DEPLOYMENT_QUERY_PARAM);
            old.delete(DEPLOYMENT_QUERY_PARAM);
            old.delete(ONBOARDING_QUERY_PARAM);
            return old;
          },
          { preventScrollReset: true },
        );
        showSuccessNotification(
          <>
            <code>{variables.parameters?.path.deployment}</code> has been
            successfully deleted.
          </>,
        );
        refetch();
      },
    },
  );

  const submitHandler = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    mutate({
      parameters: {
        path: { deployment: String(deploymentId) },
        query: { force: true },
      },
    });
  };

  return (
    <QueryDialog query={DELETE_DEPLOYMENT_QUERY_PARAM}>
      <DialogContent className="max-w-lg">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Confirm Deployment deletion
          </h3>
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this deployment?
            <code className="my-1 block max-w-fit rounded-md bg-red-50 p-0.5 text-red-700 ring-red-600/10">
              <TruncateWithTooltip>{deploymentEndpoint}</TruncateWithTooltip>
            </code>
            <Warning className="mt-4">
              This might break in-flight invocations, use with{' '}
              <span className="font-medium">caution</span>.{' '}
              <Link
                rel="noopener noreferrer"
                target="_blank"
                href="https://docs.restate.dev/services/versioning#removing-a-service"
                className="text-orange-700 decoration-orange-700"
              >
                Learn more…
              </Link>
            </Warning>
          </p>
          <Form
            id={formId}
            method="DELETE"
            action={`/deployments/${deploymentId}`}
            onSubmit={submitHandler}
          >
            <p className="mt-2 text-sm text-gray-500">
              Please confirm to proceed or close to keep the Deployment.
            </p>
            <FormFieldInput
              autoFocus
              required
              pattern="delete"
              name="confirm"
              className="mt-2"
              placeholder='Type "delete" to confirm'
              errorMessage={(errors) => {
                const isMisMatch =
                  errors.validationDetails.patternMismatch &&
                  !errors.validationDetails.valueMissing;
                if (isMisMatch) {
                  return 'Type "delete" to confirm';
                }
                return errors.validationErrors;
              }}
            />
            <DialogFooter>
              <div className="flex flex-col gap-2">
                {error && <ErrorBanner errors={[error]} />}
                <div className="flex gap-2">
                  <DialogClose>
                    <Button
                      variant="secondary"
                      className="flex-auto"
                      disabled={isPending}
                    >
                      Close
                    </Button>
                  </DialogClose>
                  <SubmitButton
                    variant="destructive"
                    form={formId}
                    className="flex-auto"
                  >
                    Delete
                  </SubmitButton>
                </div>
              </div>
            </DialogFooter>
          </Form>
        </div>
        {OnboardingGuide && <OnboardingGuide stage="delete-deployment" />}
      </DialogContent>
    </QueryDialog>
  );
}
