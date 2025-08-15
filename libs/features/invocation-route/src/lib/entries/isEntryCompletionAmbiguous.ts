import type { JournalEntryV2 } from '@restate/data-access/admin-api';
import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access/admin-api-hooks';

// TODO: move to middleware
export function isEntryCompletionAmbiguous(
  refEntry?: JournalEntryV2,
  invocation?: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data'],
) {
  if (
    !refEntry ||
    !invocation ||
    refEntry?.category !== 'command' ||
    (refEntry.type !== 'Run' && !invocation.completed_at) ||
    !refEntry.isPending
  ) {
    return { isAmbiguous: false };
  }
  const invocationIsCompleted = Boolean(invocation?.completed_at);
  const cancelledAfterEntry = invocation?.journal?.entries?.find(
    (entry) =>
      entry.category === 'notification' &&
      entry.type === 'Cancel' &&
      entry.start &&
      refEntry?.start &&
      entry.start > refEntry?.start,
  );

  return {
    isAmbiguous: Boolean(
      refEntry?.isPending && (invocationIsCompleted || cancelledAfterEntry),
    ),
    unambiguousEnd: cancelledAfterEntry?.start || invocation?.completed_at,
  };
}
