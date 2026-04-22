import type {
  components,
  JournalEntryV2,
} from '@restate/data-access/admin-api-spec';
import {
  useGetInvocationJournalWithInvocationV2,
  useGetInvocationStatusDetails,
} from '@restate/data-access/admin-api-hooks';
import type { RestateCodecOptions } from '@restate/features/codec';
import { CodecProvider } from '@restate/features/codec-options';
import type { PropsWithChildren } from 'react';

type Invocation = ReturnType<
  typeof useGetInvocationJournalWithInvocationV2
>['data'];

type TargetInvocationEntry = Extract<
  JournalEntryV2,
  {
    category?: 'command';
    type?: 'Call' | 'OneWayCall' | 'AttachInvocation';
  }
>;

function isTargetInvocationEntry(
  entry?: JournalEntryV2,
): entry is TargetInvocationEntry {
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
  targetInvocation?: components['schemas']['InvocationStatusResult'],
) {
  if (isTargetInvocationEntry(entry)) {
    return {
      service: (entry as { serviceName?: string }).serviceName,
      key: (entry as { serviceKey?: string }).serviceKey,
      handlerName: (entry as { handlerName?: string }).handlerName,
      deploymentId: entry.invocationId
        ? (targetInvocation?.pinnedDeploymentId ??
          targetInvocation?.lastAttemptDeploymentId)
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
  const targetInvocation = useGetInvocationStatusDetails(
    isTargetInvocationEntry(entry) ? entry.invocationId : undefined,
    invocation?.id,
  );
  const { service, key, handlerName, deploymentId } = getEntryCodecTarget(
    entry,
    invocation,
    targetInvocation.data,
  );
  const options = entry
    ? ({
        service: {
          value: {
            name: service,
          },
        },
        deploymentId: {
          value: deploymentId,
          isPending: targetInvocation.isPending,
          error: targetInvocation.error,
        },
        key,
        handler: {
          value: {
            name: handlerName,
          },
        },
        command: getEntryCodecCommand(entry),
      } satisfies RestateCodecOptions)
    : undefined;

  return <CodecProvider options={options}>{children}</CodecProvider>;
}
