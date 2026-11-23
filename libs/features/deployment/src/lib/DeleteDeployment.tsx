import {
  DialogClose,
  DialogContent,
  DialogFooter,
  QueryDialog,
  DialogTitle,
} from '@restate/ui-dialog';
import { DELETE_DEPLOYMENT_QUERY_PARAM } from './constants';
import { Form, useLocation, useNavigate, useSearchParams } from 'react-router';
import { Button, SubmitButton } from '@restate/ui-button';
import { ErrorBanner } from '@restate/ui-error';
import { FormFieldInput } from '@restate/ui-form-field';
import { FormEvent, useId, useState } from 'react';
import { getEndpoint } from '@restate/data-access-admin-api-spec';
import {
  useDeleteDeployment,
  useListDeployments,
} from '@restate/data-access-admin-api-hooks';
import { showSuccessNotification } from '@restate/ui-notification';
import { useRestateContext } from '@restate/features-restate-context';
import { ONBOARDING_QUERY_PARAM } from '@restate/util-feature-flag';
import { TruncateWithTooltip } from '@restate/ui-tooltip';
import { Callout } from '@restate/ui-callout';
import { Link } from '@restate/ui-link';
import { deploymentHref } from '@restate/util-panel';

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
  const { OnboardingGuide, baseUrl } = useRestateContext();
  const location = useLocation();
  const navigate = useNavigate();

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
        const isOnDeletedDeployment =
          location.pathname ===
          deploymentHref(baseUrl, { deployment: String(deploymentId) });
        if (isOnDeletedDeployment) {
          navigate(`${baseUrl}/deployments`, { replace: true });
        } else {
          setSearchParams(
            (old) => {
              old.delete(DELETE_DEPLOYMENT_QUERY_PARAM);
              old.delete(ONBOARDING_QUERY_PARAM);
              return old;
            },
            { preventScrollReset: true },
          );
        }
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
          <DialogTitle>Confirm Deployment deletion</DialogTitle>
          <p className="text-sm text-muted">
            Are you sure you want to delete this deployment?
            <code className="my-1 block max-w-fit rounded-md bg-danger-subtle p-0.5 text-danger-strong ring-danger/10">
              <TruncateWithTooltip>{deploymentEndpoint}</TruncateWithTooltip>
            </code>
          </p>
          <Callout intent="warning" className="mt-4">
            This might break in-flight invocations, use with{' '}
            <span className="font-medium">caution</span>.{' '}
            <Link
              rel="noopener noreferrer"
              target="_blank"
              href="https://docs.restate.dev/services/versioning#removing-a-service"
              className="text-warning-strong decoration-warning-strong"
            >
              Learn more…
            </Link>
          </Callout>
          <Form
            id={formId}
            method="DELETE"
            action={`/deployments/${deploymentId}`}
            onSubmit={submitHandler}
          >
            <p className="mt-2 text-sm text-muted">
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
