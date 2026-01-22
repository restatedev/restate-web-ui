import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { useGetInvocationsJournalWithInvocationsV2 } from '@restate/data-access/admin-api-hooks';
import { useMemo } from 'react';

const LIFECYCLE_EVENT_TYPES = new Set([
  'Created',
  'Running',
  'Pending',
  'Scheduled',
  'Suspended',
  'Paused',
  'Retrying',
]);

export type CombinedJournalEntry = {
  invocationId: string;
  entry?: JournalEntryV2;
  depth: number;
  parentCommand?: JournalEntryV2;
};

type LifecycleData = {
  createdEvent?: JournalEntryV2;
  lifeCycleEntries: JournalEntryV2[];
  cancelEvent?: JournalEntryV2;
};

type PreprocessedInvocationData = {
  entriesByIndex: Map<number, JournalEntryV2>;
  commandByRelatedIndex: Map<number, JournalEntryV2>;
  commandByCommandIndex: Map<number, JournalEntryV2>;
  relatedEntriesMap: Map<number, JournalEntryV2[]>;
  lifecycleData: LifecycleData;
};

function isExpandable(
  entry: JournalEntryV2,
): entry is
  | Extract<JournalEntryV2, { type?: 'Call'; category?: 'command' }>
  | Extract<
      JournalEntryV2,
      { type?: 'AttachInvocation'; category?: 'command' }
    > {
  return Boolean(
    entry.type &&
      ['Call', 'AttachInvocation'].includes(entry.type) &&
      entry.category === 'command',
  );
}

function preprocessInvocationData(
  entries: JournalEntryV2[],
): PreprocessedInvocationData {
  const entriesByIndex = new Map<number, JournalEntryV2>();
  const commandByRelatedIndex = new Map<number, JournalEntryV2>();
  const commandByCommandIndex = new Map<number, JournalEntryV2>();
  const relatedEntriesMap = new Map<number, JournalEntryV2[]>();

  let createdEvent: JournalEntryV2 | undefined;
  let cancelEvent: JournalEntryV2 | undefined;
  const lifeCycleEntries: JournalEntryV2[] = [];

  for (const entry of entries) {
    if (typeof entry.index === 'number') {
      entriesByIndex.set(entry.index, entry);
    }

    if (entry.category === 'command') {
      if (entry.relatedIndexes) {
        for (const relatedIndex of entry.relatedIndexes) {
          commandByRelatedIndex.set(relatedIndex, entry);
        }
      }
      if (typeof entry.commandIndex === 'number') {
        commandByCommandIndex.set(entry.commandIndex, entry);
      }
    }

    if (
      !createdEvent &&
      entry.category === 'event' &&
      entry.type === 'Created'
    ) {
      createdEvent = entry;
    }

    if (
      !cancelEvent &&
      entry.category === 'notification' &&
      entry.type === 'Cancel'
    ) {
      cancelEvent = entry;
    }

    if (
      (entry.category === 'event' &&
        LIFECYCLE_EVENT_TYPES.has(String(entry.type))) ||
      (entry.category === 'notification' && entry.type === 'Cancel')
    ) {
      lifeCycleEntries.push(entry);
    }
  }

  for (const entry of entries) {
    if (
      entry.category === 'command' &&
      entry.relatedIndexes &&
      entry.relatedIndexes.length > 0
    ) {
      const related: JournalEntryV2[] = [];
      for (const relatedIndex of entry.relatedIndexes) {
        const relatedEntry = entriesByIndex.get(relatedIndex);
        if (relatedEntry && !relatedEntry.isPending) {
          related.push(relatedEntry);
        }
      }
      if (typeof entry.index === 'number') {
        relatedEntriesMap.set(entry.index, related);
      }
    }
  }

  return {
    entriesByIndex,
    commandByRelatedIndex,
    commandByCommandIndex,
    relatedEntriesMap,
    lifecycleData: {
      createdEvent,
      lifeCycleEntries,
      cancelEvent,
    },
  };
}

function getCombinedJournal(
  invocationId: string,
  data: ReturnType<typeof useGetInvocationsJournalWithInvocationsV2>['data'],
  preprocessedData: Map<string, PreprocessedInvocationData>,
  depth = 0,
): CombinedJournalEntry[] {
  const entries = data?.[invocationId]?.journal?.entries;
  const processed = preprocessedData.get(invocationId);

  if (!entries || entries.length === 0) {
    return [{ invocationId, depth }];
  }

  if (!processed) {
    return [{ invocationId, depth }];
  }

  const { commandByRelatedIndex, commandByCommandIndex } = processed;

  const combinedEntries: CombinedJournalEntry[] = [];

  for (const entry of entries) {
    let parentCommand: JournalEntryV2 | undefined;
    if (entry.category !== 'command' && typeof entry.index === 'number') {
      parentCommand =
        commandByRelatedIndex.get(entry.index) ??
        ('relatedCommandIndex' in entry &&
        typeof entry.relatedCommandIndex === 'number'
          ? commandByCommandIndex.get(entry.relatedCommandIndex)
          : undefined);
    }

    combinedEntries.push({
      invocationId,
      entry,
      depth,
      parentCommand,
    });

    if (isExpandable(entry)) {
      const callInvocationId = String(entry.invocationId);
      const nestedEntries = getCombinedJournal(
        callInvocationId,
        data,
        preprocessedData,
        depth + 1,
      );
      combinedEntries.push(...nestedEntries);
    }
  }

  return combinedEntries;
}

function shouldIncludeEntry(
  entry: JournalEntryV2 | undefined,
  parentCommand: JournalEntryV2 | undefined,
  isCompact: boolean,
): boolean {
  if (!entry) return true;

  if (entry.category === 'event' && entry.type === 'Completion') {
    return false;
  }
  if (entry.category === 'notification' && entry.type === 'CallInvocationId') {
    return false;
  }
  if (
    isCompact &&
    ((parentCommand && entry.category === 'notification') ||
      entry.type === 'Event: TransientError')
  ) {
    return false;
  }
  if (entry.category === 'event' && entry.type === 'Event: Paused') {
    return false;
  }
  return true;
}

export function useProcessedJournal(
  invocationId: string,
  data: ReturnType<typeof useGetInvocationsJournalWithInvocationsV2>['data'],
  isCompact: boolean,
) {
  return useMemo(() => {
    const preprocessedData = new Map<string, PreprocessedInvocationData>();
    const relatedEntriesByInvocation = new Map<
      string,
      Map<number, JournalEntryV2[]>
    >();
    const lifecycleDataByInvocation = new Map<string, LifecycleData>();

    if (data) {
      for (const [invId, invData] of Object.entries(data)) {
        const entries = invData?.journal?.entries;
        if (!entries) continue;

        const processed = preprocessInvocationData(entries);
        preprocessedData.set(invId, processed);
        relatedEntriesByInvocation.set(invId, processed.relatedEntriesMap);
        lifecycleDataByInvocation.set(invId, processed.lifecycleData);
      }
    }

    const allCombinedEntries = data
      ? getCombinedJournal(invocationId, data, preprocessedData)
      : [];

    let inputEntry: JournalEntryV2 | undefined;
    const entriesWithoutInput: CombinedJournalEntry[] = [];

    for (const combinedEntry of allCombinedEntries) {
      if (
        !shouldIncludeEntry(
          combinedEntry.entry,
          combinedEntry.parentCommand,
          isCompact,
        )
      ) {
        continue;
      }

      if (combinedEntry.entry?.type === 'Input') {
        if (combinedEntry.invocationId === invocationId) {
          inputEntry = combinedEntry.entry;
        }
      } else {
        entriesWithoutInput.push(combinedEntry);
      }
    }

    return {
      entriesWithoutInput,
      inputEntry,
      relatedEntriesByInvocation,
      lifecycleDataByInvocation,
    };
  }, [invocationId, data, isCompact]);
}
