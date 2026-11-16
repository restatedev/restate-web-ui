import type { JournalEntryV2 } from '@restate/data-access-admin-api-spec';
import { isTargetInvocationEntry } from '@restate/features-invocation-ui';
import type { CombinedJournalEntry } from './useProcessedJournal';

function getTargetInvocationId(entry?: JournalEntryV2) {
  return isTargetInvocationEntry(entry) && entry.invocationId
    ? [entry.invocationId]
    : [];
}

export function getReferencedInvocationIds(
  rows: (CombinedJournalEntry | undefined)[],
) {
  return [
    ...new Set(
      rows.flatMap((row) => [
        ...getTargetInvocationId(row?.entry),
        ...getTargetInvocationId(row?.parentCommand),
      ]),
    ),
  ];
}

export function getEventRelatedInvocationIds(entries: JournalEntryV2[] = []) {
  const relatedCommandIndexes = new Set(
    entries.flatMap((entry) =>
      'relatedCommandIndex' in entry &&
      typeof entry.relatedCommandIndex === 'number'
        ? [entry.relatedCommandIndex]
        : [],
    ),
  );
  return [
    ...new Set(
      entries.flatMap((entry) =>
        typeof entry.commandIndex === 'number' &&
        relatedCommandIndexes.has(entry.commandIndex)
          ? getTargetInvocationId(entry)
          : [],
      ),
    ),
  ];
}
