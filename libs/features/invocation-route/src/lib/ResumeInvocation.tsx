import {
  DialogClose,
  DialogContent,
  DialogFooter,
  QueryDialog,
} from '@restate/ui/dialog';
import { RESUME_INVOCATION_QUERY_PARAM } from './constants';
import { Form, useSearchParams } from 'react-router';
import { Button, SubmitButton } from '@restate/ui/button';
import { ErrorBanner } from '@restate/ui/error';
import { FormEvent, useId } from 'react';
import {
  useGetInvocation,
  useListDeployments,
  useResumeInvocation,
} from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { FormFieldSelect } from '@restate/ui/form-field';
import {
  Deployment,
  getEndpoint,
  isHttpDeployment,
} from '@restate/data-access/admin-api';
import { ListBoxItem } from '@restate/ui/listbox';
import { Icon, IconName } from '@restate/ui/icons';
import { Revision } from '@restate/features/deployment';
import { Badge } from '@restate/ui/badge';
import { useRestateContext } from '@restate/features/restate-context';

export function ResumeInvocation() {
  const formId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const invocationId = searchParams.get(RESUME_INVOCATION_QUERY_PARAM);
  const { data: invocation, isPending: isGetInvocationPending } =
    useGetInvocation(String(invocationId), {
      enabled: Boolean(invocationId),
    });
  const { data: listDeployments } = useListDeployments();
  const service = listDeployments?.services.get(
    String(invocation?.target_service_name),
  );
  const deployments = Object.entries(service?.deployments ?? {})
    .reduce(
      (results, [revision, deployments]) => {
        return [
          ...results,
          ...deployments.map((deploymentId) => ({
            revision: Number(revision),
            deployment: listDeployments?.deployments?.get(deploymentId),
          })),
        ];
      },
      [] as { revision: number; deployment?: Deployment }[],
    )
    .filter(({ deployment }) => {
      if (!deployment) {
        return false;
      }
      const isProtocolMatch = invocation?.pinned_service_protocol_version
        ? deployment.min_protocol_version <=
            invocation?.pinned_service_protocol_version &&
          deployment.max_protocol_version >=
            invocation?.pinned_service_protocol_version
        : true;

      return isProtocolMatch;
    });

  const { mutate, isPending, error, reset } = useResumeInvocation(
    invocationId ?? '',
    {
      onSuccess(data, variables) {
        setSearchParams(
          (old) => {
            old.delete(RESUME_INVOCATION_QUERY_PARAM);
            return old;
          },
          { preventScrollReset: true },
        );
        showSuccessNotification(
          <>
            <code>{invocationId}</code> has been successfully resumed.
          </>,
        );
      },
    },
  );
  const { tunnel } = useRestateContext();

  const submitHandler = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const deployment = formData.get('deployment');
    const isKeep = deployment === 'Keep';
    const isLatest = deployment === 'Latest';

    mutate({
      parameters: {
        path: { invocation_id: String(invocationId) },
        ...(!isKeep && {
          query: {
            deployment: isLatest ? 'Latest' : (String(deployment) as any),
          },
        }),
      },
    });
  };

  return (
    <QueryDialog query={RESUME_INVOCATION_QUERY_PARAM}>
      <DialogContent className="max-w-lg">
        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-1 text-lg leading-6 font-medium text-gray-900">
            <Icon
              name={IconName.Resume}
              className="-ml-2 h-10 w-10 fill-blue-50 p-1.5 text-blue-400 drop-shadow-md"
            />
            Resume Invocation
          </h3>
          <div className="flex flex-col gap-2 text-sm text-gray-500">
            <p className="mt-2 text-sm text-gray-500">
              Invocation{' '}
              <code className="inline-block rounded-md bg-blue-50 p-0.5 text-blue-600 ring-blue-600/10">
                {invocationId}
              </code>{' '}
              is currently {invocation?.status}. Select the deployment you'd
              like to run it on, then resume execution.
            </p>
          </div>
          <Form
            id={formId}
            method="PATCH"
            action={`/invocations/${invocationId}/resume`}
            onSubmit={submitHandler}
            key={String(isGetInvocationPending)}
          >
            <FormFieldSelect
              className="mt-4 min-w-xs flex-auto basis-[calc(50%-var(--spacing)*2)] [&_button>*]:max-w-full"
              label="Deployment"
              placeholder="deployment"
              defaultValue={
                invocation?.pinned_deployment_id ? 'Keep' : 'Latest'
              }
              name="deployment"
              disabled={!invocation?.pinned_deployment_id}
            >
              {invocation &&
                deployments.map(({ revision, deployment }) => {
                  const isCurrent =
                    deployment?.id === invocation?.pinned_deployment_id;
                  const isLatest = service?.sortedRevisions.at(0) === revision;

                  const isTunnel = Boolean(
                    tunnel?.isEnabled &&
                      deployment &&
                      isHttpDeployment(deployment) &&
                      tunnel.fromHttp(deployment.uri),
                  );
                  const endpoint = getEndpoint(deployment);
                  const tunnelEndpoint = isTunnel
                    ? tunnel?.fromHttp(endpoint)
                    : undefined;

                  const deploymentEndpoint = isTunnel
                    ? tunnelEndpoint?.remoteUrl
                    : endpoint;

                  return (
                    <ListBoxItem
                      className="w-full max-w-xl"
                      value={
                        isCurrent
                          ? 'Keep'
                          : isLatest
                            ? 'Latest'
                            : deployment!.id
                      }
                      key={deployment?.id}
                    >
                      <div className="flex w-full min-w-0 flex-auto items-center gap-2 truncate">
                        <div className="h-6 w-6 shrink-0 rounded-md border bg-white shadow-xs">
                          <Icon
                            name={
                              isTunnel
                                ? IconName.Tunnel
                                : isHttpDeployment(deployment!)
                                  ? IconName.Http
                                  : IconName.Lambda
                            }
                            className="h-full w-full p-1 text-zinc-400"
                          />
                        </div>
                        {isTunnel && (
                          <Badge
                            size="xs"
                            className="max-w-fit min-w-0 grow basis-[12ch] rounded-sm py-0.5 font-mono text-2xs leading-3 font-medium"
                          >
                            <div className="w-full truncate">
                              {tunnelEndpoint?.name}
                            </div>
                          </Badge>
                        )}
                        <div className="max-w-fit min-w-0 grow basis-full truncate">
                          {deploymentEndpoint}
                        </div>
                        {isCurrent && (
                          <Badge size="xs" variant="info">
                            CURRENT
                          </Badge>
                        )}
                        {isLatest && !isCurrent && (
                          <Badge size="xs" variant="info">
                            LATEST
                          </Badge>
                        )}
                        <Revision
                          revision={revision}
                          className="z-2 ml-auto bg-white"
                        />
                      </div>
                    </ListBoxItem>
                  );
                })}
            </FormFieldSelect>
            <DialogFooter>
              <div className="flex flex-col gap-2">
                {error && <ErrorBanner errors={[error]} />}
                <div className="flex gap-2">
                  <DialogClose>
                    <Button
                      variant="secondary"
                      className="flex-auto"
                      disabled={isPending}
                      onClick={() => reset()}
                    >
                      Close
                    </Button>
                  </DialogClose>
                  <SubmitButton form={formId} className="flex-auto">
                    Resume
                  </SubmitButton>
                </div>
              </div>
            </DialogFooter>
          </Form>
        </div>
      </DialogContent>
    </QueryDialog>
  );
}
