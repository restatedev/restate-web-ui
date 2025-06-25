import {
  JournalEntryV2,
  useGetInvocationJournalWithInvocationV2,
} from '@restate/data-access/admin-api';

export function isEntryCompletionAmbiguous(
  refEntry?: JournalEntryV2,
  invocation?: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data']
) {
  if (!refEntry || !invocation) {
    return false;
  }
  const invocationIsCompleted = Boolean(invocation.completed_at);
  const cancelledAfterEntry = invocation.journal?.entries?.some(
    (entry) =>
      entry.category === 'notification' &&
      entry.type === 'cancel' &&
      entry.start &&
      refEntry?.start &&
      entry.start > refEntry?.start
  );

  return Boolean(
    refEntry?.isPending && (invocationIsCompleted || cancelledAfterEntry)
  );
}
