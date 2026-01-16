import { withConfirmation } from '@restate/ui/dialog';
import { FormEvent } from 'react';
import {
  useGetInvocation,
  useGetInvocationJournalWithInvocationV2,
  useListDeployments,
  useRestartInvocationAsNew,
} from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { Icon, IconName } from '@restate/ui/icons';
import { useRestateContext } from '@restate/features/restate-context';
import { useSearchParams } from 'react-router';
import {
  Deployment,
  getEndpoint,
  isHttpDeployment,
  JournalEntryV2,
} from '@restate/data-access/admin-api';
import { FormFieldSelect } from '@restate/ui/form-field';
import { ListBoxItem } from '@restate/ui/listbox';
import { Badge } from '@restate/ui/badge';
import { Revision } from '@restate/features/deployment';

import { CommandEntryType } from '../entries/types';

const NAME_COMMANDS_COMPONENTS: {
  [K in CommandEntryType]: string;
} = {
  Input: '',
  GetState: 'get',
  GetEagerState: 'get',
  SetState: 'set',
  GetStateKeys: 'keys',
  GetEagerStateKeys: 'keys',
  ClearState: 'clear',
  ClearAllState: 'clearAll',
  Call: 'call',
  Run: 'run',
  Output: '',
  OneWayCall: 'send',
  Sleep: 'sleep',
  CompleteAwakeable: 'awakeable',
  Awakeable: 'awakeable',
  AttachInvocation: 'attach',
  Cancel: 'cancel',
  GetPromise: 'promise',
  PeekPromise: 'promise',
  CompletePromise: 'promise',
};

export const RESTART_AS_NEW_INVOCATION_QUERY_PARAM = 'restart-new-invocation';
export const RESTART_AS_NEW_INVOCATION_FROM_QUERY_PARAM =
  'restart-new-invocation-from';

function EntryParams({
  entry,
}: {
  entry: Extract<JournalEntryV2, { category?: 'command' }>;
}) {
  switch (entry.type) {
    case 'Run':
    case 'Sleep':
      return entry.name ? `"${entry.name}"` : null;
    case 'SetState':
      return entry.key ? `"${entry.key}", Value` : null;
    case 'GetEagerState':
    case 'GetState':
    case 'ClearState':
      return entry.key ? `"${entry.key}"` : null;
    case 'Call':
    case 'OneWayCall':
      return [entry.serviceName, entry.serviceKey].filter(Boolean).join('/');
    case 'AttachInvocation':
    case 'Cancel':
      return `"${entry.invocationId}"`;
    case 'Awakeable':
    case 'CompleteAwakeable':
      return `"${entry.id}"`;

    default:
      return null;
  }
}
function EntryChain({
  entry,
}: {
  entry: Extract<JournalEntryV2, { category?: 'command' }>;
}) {
  switch (entry.type) {
    case 'Call':
    case 'OneWayCall':
      return (
        <>
          .{entry.handlerName}
          <span className="opacity-70">(…)</span>
        </>
      );
    case 'CompleteAwakeable':
      return (
        <>
          .resolve
          <span className="opacity-70">(…)</span>
        </>
      );

    default:
      return null;
  }
}

function RestartInvocationContent() {
  const [searchParams] = useSearchParams();
  const invocationId = searchParams.get(RESTART_AS_NEW_INVOCATION_QUERY_PARAM);
  const startFrom =
    searchParams.get(RESTART_AS_NEW_INVOCATION_FROM_QUERY_PARAM) || '0';

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

  const { tunnel, isVersionGte } = useRestateContext();
  const isRestartedFromSupported = isVersionGte?.('1.6.0');
  const journalQuery = useGetInvocationJournalWithInvocationV2(
    String(invocationId),
    {
      refetchOnMount: false,
      staleTime: 0,
      enabled: !!invocationId,
    },
  );

  const firstPendingCommand =
    journalQuery.data?.journal?.entries?.findIndex(
      (entry) => entry.category === 'command' && entry.isPending,
    ) || -1;

  return (
    <>
      {isRestartedFromSupported && (
        <>
          <FormFieldSelect
            className="mt-4 min-w-xs flex-auto basis-[calc(50%-var(--spacing)*2)] [&_button>*]:max-w-full"
            label={
              <>
                Restart from
                <span slot="description">
                  Journal is retained up to and including this action
                </span>
              </>
            }
            placeholder={
              journalQuery.isPending
                ? 'Loading…'
                : 'Select which journal entry to restart from'
            }
            disabled={journalQuery.isPending}
            defaultValue={startFrom}
            name="from"
            required
            dropdownFooter={
              firstPendingCommand !== -1 ? (
                <div className="mt-1 mr-2 mb-2 ml-4">
                  Remaining actions unavailable. Restart requires all prior
                  actions to be completed.
                </div>
              ) : undefined
            }
          >
            {journalQuery.data?.journal?.entries
              ?.filter(
                (entry, index) =>
                  (firstPendingCommand === -1 || index < firstPendingCommand) &&
                  entry.category === 'command' &&
                  entry.type !== 'Output',
              )
              ?.map((entry, index) => {
                if (entry.type === 'Input') {
                  return (
                    <ListBoxItem className="w-full max-w-xl" value={'0'}>
                      <div>Beginning</div>
                      <div className="text-xs opacity-70">
                        (retains only the original input)
                      </div>
                    </ListBoxItem>
                  );
                }
                return (
                  <ListBoxItem
                    className="w-full max-w-xl"
                    value={String(entry.index)}
                    key={index}
                  >
                    <div className="flex items-center gap-1.5 font-mono text-0.5xs">
                      <div className="opacity-70">{entry.commandIndex}</div>
                      <div className="font-medium italic">
                        {
                          NAME_COMMANDS_COMPONENTS[
                            entry.type as CommandEntryType
                          ]
                        }
                        <span className="inline-flex items-baseline">
                          <span className="opacity-70">(</span>
                          <span className="max-w-[30ch] truncate px-0.5 font-sans text-xs opacity-70">
                            <EntryParams
                              entry={
                                entry as Extract<
                                  JournalEntryV2,
                                  { category?: 'command' }
                                >
                              }
                            />
                          </span>
                          <span className="opacity-70">)</span>
                          <EntryChain
                            entry={
                              entry as Extract<
                                JournalEntryV2,
                                { category?: 'command' }
                              >
                            }
                          />
                        </span>
                      </div>
                    </div>
                  </ListBoxItem>
                );
              })}
          </FormFieldSelect>
          <FormFieldSelect
            className="mt-4 min-w-xs flex-auto basis-[calc(50%-var(--spacing)*2)] [&_button>*]:max-w-full"
            label=<>Deployment</>
            placeholder={
              deployments.length > 0
                ? 'Select a deployment'
                : 'No deployments available'
            }
            defaultValue={'Latest'}
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
                      isLatest ? 'Latest' : isCurrent ? 'Keep' : deployment!.id
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
                          <Icon
                            name={IconName.AtSign}
                            className="mr-0.5 h-3 w-3"
                          />

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
        </>
      )}
      <input type="hidden" name="invocation-id" value={invocationId || ''} />
    </>
  );
}

function RestartAlert() {
  const { isVersionGte } = useRestateContext();
  const isRestartedFromSupported = isVersionGte?.('1.6.0');

  if (isRestartedFromSupported) {
    return (
      <>
        This creates a new invocation with the journal retained up to the
        selected action, leaving the original unchanged. The new invocation will
        have a <span className="font-semibold">different ID</span>, and after a
        successful restart you'll be{' '}
        <span className="font-semibold">redirected</span> to it.
      </>
    );
  } else {
    return (
      <>
        This creates a new invocation with the same input as the original,
        leaving the original unchanged. The new invocation will have a{' '}
        <span className="font-semibold">different ID</span>, and after a
        successful restart you'll be{' '}
        <span className="font-semibold">redirected</span> to it.
      </>
    );
  }
}

export const RestartInvocation = withConfirmation({
  queryParam: RESTART_AS_NEW_INVOCATION_QUERY_PARAM,
  shouldShowSkipConfirmation: false,
  userPreferenceId: 'skip-restart-action-dialog',
  onCloseQueryParam: (searchParams) => {
    searchParams.delete(RESTART_AS_NEW_INVOCATION_FROM_QUERY_PARAM);
    searchParams.delete(RESTART_AS_NEW_INVOCATION_QUERY_PARAM);
    return searchParams;
  },
  useMutation: useRestartInvocationAsNew,
  getFormData: function (...args: string[]) {
    const [invocationId] = args;
    const formData = new FormData();
    formData.append('invocation-id', String(invocationId));
    return formData;
  },
  ToastCountDownMessage: ({ formData }) => {
    const id = String(formData.get('invocation-id'));
    return (
      <>
        Restarting a new invocation from{' '}
        <code className="font-semibold">
          {id.substring(0, 8)}…{id.slice(-5)}
        </code>
      </>
    );
  },
  ToastErrorMessage: ({ formData }) => {
    const id = String(formData.get('invocation-id'));
    return (
      <>
        Failed to restart{' '}
        <code className="font-semibold">
          {id.substring(0, 8)}…{id.slice(-5)}
        </code>
      </>
    );
  },
  getQueryParamValue: function (input) {
    if (input instanceof URLSearchParams) {
      return input.get(RESTART_AS_NEW_INVOCATION_QUERY_PARAM);
    } else {
      return input.get('invocation-id') as string;
    }
  },

  getUseMutationInput: function (input) {
    if (input instanceof URLSearchParams) {
      return input.get(RESTART_AS_NEW_INVOCATION_QUERY_PARAM);
    } else {
      return input.get('invocation-id') as string;
    }
  },

  useHelpers: () => {
    const { baseUrl } = useRestateContext();
    return { baseUrl };
  },

  onSubmit: (mutate, event: FormEvent<HTMLFormElement> | FormData) => {
    let formData: FormData;

    if (event instanceof FormData) {
      formData = event;
    } else {
      event.preventDefault();
      formData = new FormData(event.currentTarget);
    }

    const deployment = formData.get('deployment');
    const isKeep = deployment === 'Keep';
    const isLatest = deployment === 'Latest' || !deployment;
    const fromValue = Number(formData.get('from'));
    const from = !isNaN(fromValue) ? fromValue : undefined;
    const invocationId = formData.get('invocation-id');

    mutate({
      parameters: {
        path: { invocation_id: String(invocationId) },
        query: {
          ...(!isLatest && {
            deployment: isKeep ? 'Keep' : (String(deployment) as any),
          }),
          from,
        },
      },
    });
  },

  title: 'Restart as new Invocation',
  icon: IconName.Restart,
  description: (
    <p>Are you sure you want to restart this invocation as a new one?</p>
  ),
  alertType: 'info',
  alertContent: <RestartAlert />,
  submitText: 'Restart',
  formMethod: 'PATCH',
  formAction: (invocation_id) => `/invocations/${invocation_id}/restart-as-new`,

  Content: RestartInvocationContent,

  onSuccess: (
    data,
    _variables,
    _context,
    { navigate, searchParams, baseUrl },
  ) => {
    const invocationId = _variables.parameters?.path.invocation_id;
    const newInvocationId = data?.new_invocation_id;
    if (newInvocationId) {
      searchParams.delete(RESTART_AS_NEW_INVOCATION_QUERY_PARAM);
      searchParams.delete(RESTART_AS_NEW_INVOCATION_FROM_QUERY_PARAM);
      navigate({
        pathname: `${baseUrl}/invocations/${newInvocationId}`,
        search: searchParams.toString(),
      });
      showSuccessNotification(
        <p>
          <code className="font-semibold">
            {newInvocationId.substring(0, 8)}…{newInvocationId.slice(-5)}
          </code>{' '}
          was created as the new invocation after restarting{' '}
          <code>
            {invocationId?.substring(0, 8)}…{invocationId?.slice(-5)}
          </code>
          .
        </p>,
      );
    }
  },
});
