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

  const refEntryStart = refEntry.start
    ? new Date(refEntry.start).getTime()
    : undefined;
  const cancelledAfterEntry = getCancelNotifications(
    invocation.journal?.entries,
  ).find(
    (entry) =>
      entry.start &&
      refEntryStart !== undefined &&
      new Date(entry.start).getTime() > refEntryStart,
  );
  const invocationIsCompleted = Boolean(invocation.completed_at);
  const invocationIspaused = Boolean(invocation.status === 'paused');

  if (!invocationIsCompleted && !invocationIspaused && !cancelledAfterEntry) {
    return { isAmbiguous: false };
  }

  const ends = [
    invocationIspaused
      ? { mode: 'paused' as const, at: invocation.modified_at }
      : undefined,
    cancelledAfterEntry
      ? { mode: 'cancelled' as const, at: cancelledAfterEntry.start }
      : undefined,
    invocationIsCompleted
      ? { mode: 'completion' as const, at: invocation.completed_at }
      : undefined,
  ]
    .filter((end) => Boolean(end?.at))
    .map((end) => ({
      mode: end!.mode,
      at: String(end!.at),
      time: new Date(String(end!.at)).getTime(),
    }))
    .filter((end) => Number.isFinite(end.time))
    .sort((a, b) => a.time - b.time);
  const earliestEnd = ends.at(0);

  return {
    isAmbiguous: true,
    mode: earliestEnd?.mode,
    unambiguousEnd: earliestEnd?.at,
  };
}
