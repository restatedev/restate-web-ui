import type {
  components,
  JournalEntryV2,
} from '@restate/data-access/admin-api-spec';
import {
  useGetInvocationJournalWithInvocationV2,
  useServiceDetails,
} from '@restate/data-access/admin-api-hooks';
import {
  CodecProvider,
  type RestateCodecOptions,
} from '@restate/features/codec';
import type { PropsWithChildren } from 'react';
import { useJournalEntriesContext } from '../JournalContext';

type Invocation = ReturnType<
  typeof useGetInvocationJournalWithInvocationV2
>['data'];

type ReferencedInvocationEntry = Extract<
  JournalEntryV2,
  {
    category?: 'command';
    type?: 'Call' | 'OneWayCall' | 'AttachInvocation';
  }
>;

function isReferencedInvocationEntry(
  entry?: JournalEntryV2,
): entry is ReferencedInvocationEntry {
  return (
    entry?.category === 'command' &&
    (entry.type === 'Call' ||
      entry.type === 'OneWayCall' ||
      entry.type === 'AttachInvocation')
  );
}

function getEntryCodecTarget(
  entry?: JournalEntryV2,
  invocation?: Invocation,
  referencedInvocations?: Record<
    string,
    components['schemas']['InvocationStatusResult'] | undefined
  >,
) {
  if (isReferencedInvocationEntry(entry)) {
    return {
      service: (entry as { serviceName?: string }).serviceName,
      key: (entry as { serviceKey?: string }).serviceKey,
      handlerName: (entry as { handlerName?: string }).handlerName,
      deploymentId: entry.invocationId
        ? (referencedInvocations?.[entry.invocationId]?.pinnedDeploymentId ??
          referencedInvocations?.[entry.invocationId]?.lastAttemptDeploymentId)
        : undefined,
    };
  }

  return {
    service: invocation?.target_service_name,
    key: invocation?.target_service_key,
    handlerName: invocation?.target_handler_name,
    deploymentId:
      invocation?.pinned_deployment_id ??
      invocation?.last_attempt_deployment_id,
  };
}

function getEntryCodecCommand(
  entry?: JournalEntryV2,
): RestateCodecOptions['command'] {
  if (!entry) {
    return undefined;
  }

  switch (entry.type) {
    case 'SetState':
    case 'GetState':
    case 'GetEagerState':
    case 'GetLazyState':
      return { type: entry.type, name: (entry as { key?: string }).key };
    case 'GetPromise':
    case 'PeekPromise':
    case 'CompletePromise':
      return {
        type: entry.type,
        name: (entry as { promiseName?: string }).promiseName,
      };
    case 'Awakeable':
    case 'CompleteAwakeable':
      return { type: entry.type, name: (entry as { id?: string }).id };
    case 'Signal':
    case 'SendSignal':
      return {
        type: entry.type,
        name: (entry as { signalName?: string }).signalName,
      };
    case 'Run':
    case 'Call':
    case 'OneWayCall':
      return { type: entry.type, name: (entry as { name?: string }).name };
    default:
      return { type: entry.type };
  }
}

export function EntryCodecProvider({
  entry,
  invocation,
  children,
}: PropsWithChildren<{
  entry?: JournalEntryV2;
  invocation?: Invocation;
}>) {
  const { referencedInvocations } = useJournalEntriesContext();
  const { service, key, handlerName, deploymentId } = getEntryCodecTarget(
    entry,
    invocation,
    referencedInvocations,
  );
  const { data: serviceDetails } = useServiceDetails(service ?? '', {
    enabled: Boolean(service && handlerName),
    refetchOnMount: false,
  });
  const handler = handlerName
    ? serviceDetails?.handlers.find(({ name }) => name === handlerName)
    : undefined;
  const options = entry
    ? ({
        service,
        deploymentId,
        key,
        handler: handler
          ? {
              name: handler.name,
              metadata: handler.metadata,
              input_description: handler.input_description,
              input_json_schema: handler.input_json_schema,
              output_description: handler.output_description,
              output_json_schema: handler.output_json_schema,
            }
          : handlerName
            ? { name: handlerName }
            : undefined,
        command: getEntryCodecCommand(entry),
      } satisfies RestateCodecOptions)
    : undefined;

  return <CodecProvider options={options}>{children}</CodecProvider>;
}
