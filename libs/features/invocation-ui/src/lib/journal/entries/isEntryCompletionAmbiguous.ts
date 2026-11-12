import type { JournalEntryV2 } from '@restate/data-access-admin-api-spec';
import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access-admin-api-hooks';

const cancelNotificationsByEntries = new WeakMap<
  JournalEntryV2[],
  JournalEntryV2[]
>();

function getCancelNotifications(entries: JournalEntryV2[] = []) {
  let cancelNotifications = cancelNotificationsByEntries.get(entries);
  if (!cancelNotifications) {
    cancelNotifications = entries.filter(
      (entry) => entry.category === 'notification' && entry.type === 'Cancel',
    );
    cancelNotificationsByEntries.set(entries, cancelNotifications);
  }
  return cancelNotifications;
}

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
    refEntry.category !== 'command' ||
    !refEntry.isPending
  ) {
    return { isAmbiguous: false };
  }

  const cancelledAfterEntry = getCancelNotifications(
    invocation.journal?.entries,
  ).find(
    (entry) => entry.start && refEntry.start && entry.start > refEntry.start,
  );
  const invocationIsCompleted = Boolean(invocation.completed_at);
  const invocationIspaused = Boolean(invocation.status === 'paused');

  if (
    refEntry.type !== 'Run' &&
    !invocationIsCompleted &&
    !invocationIspaused &&
    !cancelledAfterEntry
  ) {
    return { isAmbiguous: false };
  }

  const dates = [
    invocationIspaused && invocation.modified_at,
    cancelledAfterEntry?.start,
    invocation?.completed_at,
  ]
    .filter(Boolean)
    .map((date) => new Date(String(date)).getTime());
  const unambiguousEnd =
    dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : undefined;

  return {
    isAmbiguous: Boolean(
      refEntry?.isPending &&
      (invocationIsCompleted || cancelledAfterEntry || invocationIspaused),
    ),
    mode: unambiguousEnd
      ? invocationIspaused && unambiguousEnd === invocation.modified_at
        ? ('paused' as const)
        : unambiguousEnd === cancelledAfterEntry?.start
          ? ('cancelled' as const)
          : unambiguousEnd === invocation?.completed_at
            ? ('completion' as const)
            : undefined
      : undefined,

    unambiguousEnd,
  };
}
