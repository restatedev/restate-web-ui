import { withConfirmation } from '@restate/ui/dialog';
import { FormEvent } from 'react';
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
import { useSearchParams } from 'react-router';

const RESUME_INVOCATION_QUERY_PARAM = 'resume-invocation';

function ResumeInvocationContent() {
  const [searchParams] = useSearchParams();
  const invocationId = searchParams.get(RESUME_INVOCATION_QUERY_PARAM);

  const { data: invocation } = useGetInvocation(String(invocationId), {
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

  const { tunnel } = useRestateContext();

  return (
    <>
      <FormFieldSelect
        className="mt-4 min-w-xs flex-auto basis-[calc(50%-var(--spacing)*2)] [&_button>*]:max-w-full"
        label="Deployment"
        placeholder={
          deployments.length > 0
            ? 'Select a deployment'
            : 'No deployments available'
        }
        defaultValue={invocation?.pinned_deployment_id ? 'Keep' : 'Latest'}
        key={invocation?.pinned_deployment_id ? 'Keep' : 'Latest'}
        name="deployment"
        required
      >
        {invocation &&
          deployments.map(({ revision, deployment }) => {
            const isCurrent =
              deployment?.id === invocation?.pinned_deployment_id;
            const isLatest = service?.sortedRevisions.at(0) === revision;

            if (!invocation.pinned_deployment_id && !isLatest) {
              return null;
            }

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
                  isCurrent ? 'Keep' : isLatest ? 'Latest' : deployment!.id
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
                      <Icon name={IconName.AtSign} className="mr-0.5 h-3 w-3" />

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
      <input type="hidden" name="invocation-id" value={invocationId || ''} />
    </>
  );
}

export const ResumeInvocation = withConfirmation({
  queryParam: RESUME_INVOCATION_QUERY_PARAM,

  useMutation: useResumeInvocation,

  buildUseMutationInput: (input) => {
    if (input instanceof URLSearchParams) {
      return input.get(RESUME_INVOCATION_QUERY_PARAM);
    }
  },

  onSubmit: (mutate, event: FormEvent<HTMLFormElement> | FormData) => {
    if (event instanceof FormData) {
      return;
    }
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const invocationId = formData.get('invocation-id');
    const deployment = formData.get('deployment');
    const isKeep = deployment === 'Keep';
    const isLatest = deployment === 'Latest' || !deployment;

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
  },

  title: 'Resume Invocation',
  icon: IconName.Resume,
  description: (
    <p className="mt-2 text-sm text-gray-500">
      Select the deployment you'd like to run this invocation on, then resume
      execution.
    </p>
  ),
  submitText: 'Resume',
  formMethod: 'PATCH',

  Content: ResumeInvocationContent,

  onSuccess: (_data, _variables, _context, { searchParams }) => {
    const invocationId = searchParams.get(RESUME_INVOCATION_QUERY_PARAM);
    showSuccessNotification(
      <>
        <code>{invocationId}</code> has been successfully resumed.
      </>,
    );
  },
});
