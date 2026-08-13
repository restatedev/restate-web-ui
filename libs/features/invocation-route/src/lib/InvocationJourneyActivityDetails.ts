import type { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import type {
  InvocationJourneyModel,
  JourneyActivityDetail,
  JourneyActivityDetailGroup,
  JourneyJournalInvocation,
} from './InvocationJourneyModel';

const MAX_ACTIVITY_DETAIL_ITEMS = 10;

export function journalEntriesOfType(
  journalEntries: JournalEntryV2[],
  type: string,
) {
  return journalEntries.filter((entry) => entry.type === type);
}

function relatedCommand(
  entry: JournalEntryV2,
  journalEntries: JournalEntryV2[],
) {
  const commandIndex =
    'relatedCommandIndex' in entry &&
    typeof entry.relatedCommandIndex === 'number'
      ? entry.relatedCommandIndex
      : undefined;
  if (commandIndex === undefined) return undefined;

  return journalEntries.find(
    (candidate) =>
      candidate.category === 'command' &&
      candidate.commandIndex === commandIndex &&
      (typeof entry.index !== 'number' ||
        typeof candidate.index !== 'number' ||
        candidate.index < entry.index),
  );
}

function capActivityDetails(
  items: JourneyActivityDetail[],
  options: Omit<JourneyActivityDetailGroup, 'items' | 'totalItems'>,
): JourneyActivityDetailGroup {
  return {
    ...options,
    items: items.slice(-MAX_ACTIVITY_DETAIL_ITEMS),
    totalItems: items.length,
  };
}

function errorBackoffActivityDetails(
  journalEntries: JournalEntryV2[],
  invocation: JourneyJournalInvocation,
) {
  const retainedErrors = journalEntriesOfType(
    journalEntries,
    'Event: TransientError',
  );
  const items = retainedErrors.map((entry, index) => ({
    key: `error-backoff-${entry.index ?? index}`,
    entry,
    parentCommand: relatedCommand(entry, journalEntries),
  }));

  return capActivityDetails(items, {
    invocation,
    itemNoun: 'transient-error events',
    summary: 'Deduplicated transient errors from the invocation journal.',
    emptyMessage: 'No retained transient-error journal events are available.',
  });
}

function pauseActivityDetails(
  pauses: number,
  journalEntries: JournalEntryV2[],
  invocation: JourneyJournalInvocation,
) {
  const entries = journalEntriesOfType(journalEntries, 'Paused')
    .filter((entry) => !entry.isPending)
    .slice(-pauses);
  const items = entries.map((entry, index) => ({
    key: `pause-${entry.index ?? index}`,
    entry,
    parentCommand: relatedCommand(entry, journalEntries),
  }));

  return capActivityDetails(items, {
    invocation,
    itemNoun: 'pauses',
    emptyMessage: 'No retained pause journal events are available.',
  });
}

function suspensionActivityDetails(
  suspensions: number,
  journalEntries: JournalEntryV2[],
  invocation: JourneyJournalInvocation,
) {
  const entries = journalEntriesOfType(journalEntries, 'Suspended')
    .filter((entry) => !entry.isPending)
    .slice(-suspensions);
  const items = entries.map((entry, index) => ({
    key: `suspension-${entry.index ?? index}`,
    entry,
  }));

  return capActivityDetails(items, {
    invocation,
    itemNoun: 'suspensions',
    emptyMessage:
      'No retained protocol-v7 suspension journal events are available.',
  });
}

export function getJourneyActivityDetails(
  errorBackoffs: number,
  pauses: number,
  suspensions: number,
  journalEntries: JournalEntryV2[],
  invocation: JourneyJournalInvocation,
): InvocationJourneyModel['activityDetails'] {
  const details: NonNullable<InvocationJourneyModel['activityDetails']> = {};

  if (errorBackoffs > 0) {
    details.errorBackoffs = errorBackoffActivityDetails(
      journalEntries,
      invocation,
    );
  }
  if (pauses > 0) {
    details.pauses = pauseActivityDetails(pauses, journalEntries, invocation);
  }
  if (suspensions > 0) {
    details.suspensions = suspensionActivityDetails(
      suspensions,
      journalEntries,
      invocation,
    );
  }

  return details;
}
