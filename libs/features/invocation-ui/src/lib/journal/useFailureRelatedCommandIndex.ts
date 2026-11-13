import {
  useGetInvocationJournalWithInvocationV2,
  useGetPausedError,
} from '@restate/data-access-admin-api-hooks';

type InvocationWithJournal = ReturnType<
  typeof useGetInvocationJournalWithInvocationV2
>['data'];

export function useFailureRelatedCommandIndex(
  invocation?: InvocationWithJournal,
  options?: Parameters<typeof useGetPausedError>[1],
) {
  const isPaused = invocation?.status === 'paused';
  const { data: pausedError } = useGetPausedError(String(invocation?.id), {
    ...options,
    enabled: options?.enabled !== false && isPaused,
  });

  return {
    commandIndex:
      invocation?.last_failure_related_command_index ??
      pausedError?.relatedCommandIndex,
    pausedError,
  };
}
