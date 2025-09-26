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
import { FormEvent, useId, useState } from 'react';
import { getEndpoint } from '@restate/data-access/admin-api';
import {
  useDeleteDeployment,
  useListDeployments,
} from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { useRestateContext } from '@restate/features/restate-context';
import { ONBOARDING_QUERY_PARAM } from '@restate/util/feature-flag';

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
      <DialogContent>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Confirm Deployment deletion
          </h3>
          <p className="text-sm text-gray-500">
            Are you sure you want to delete{' '}
            <code className="inline-block rounded-md bg-red-50 p-0.5 text-red-700 ring-red-600/10">
              {deploymentEndpoint}
            </code>
            ? This might break in-flight invocations, use with{' '}
            <span className="font-medium">caution</span>.
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
