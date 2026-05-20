import { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import { useGetInvocationsJournalWithInvocationsV2 } from '@restate/data-access/admin-api-hooks';
import { useMemo } from 'react';

// Event types that the lifecycle viewer renders separately from the main
// timeline.
const LIFECYCLE_EVENT_TYPES = new Set([
  'Created',
  'Running',
  'Pending',
  'Scheduled',
  'Suspended',
  'Paused',
  'Retrying',
]);

// `depth` increases when nesting under a parent invocation
// (Call/AttachInvocation). `parentCommand` lets non-command entries link
// back to the command they belong to.
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

// Lookup tables computed once per invocation so the render passes don't
// re-scan entries on every lookup.
type PreprocessedInvocationData = {
  entriesByIndex: Map<number, JournalEntryV2>;
  commandByRelatedIndex: Map<number, JournalEntryV2>;
  commandByCommandIndex: Map<number, JournalEntryV2>;
  relatedEntriesMap: Map<number, JournalEntryV2[]>;
  lifecycleData: LifecycleData;
};

// Call/AttachInvocation commands point at another invocation whose journal
// is also loaded; getCombinedJournal recurses into them.
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

  // Pass 1: build index lookups, capture lifecycle events.
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

  // Pass 2: with entriesByIndex now complete, resolve each command's
  // related entries (skipping pending ones — they haven't completed yet).
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

// Walks one invocation's entries, recursing into Call/AttachInvocation
// targets depth-first so the result is a flat list spanning every loaded
// invocation. `visited` is a cycle guard for the invocation graph: if a
// back-edge exists (A → B → A) we'd loop forever, so revisiting bails out.
// When entries haven't loaded yet, returns a single placeholder so the row
// can still render a loading state.
function getCombinedJournal(
  invocationId: string,
  data: ReturnType<typeof useGetInvocationsJournalWithInvocationsV2>['data'],
  preprocessedData: Map<string, PreprocessedInvocationData>,
  depth = 0,
  visited: Set<string> = new Set(),
): CombinedJournalEntry[] {
  if (visited.has(invocationId)) {
    return [];
  }
  visited.add(invocationId);

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
    // Non-command entries link to their owning command either via their own
    // index (the command's relatedIndexes points at them) or via an
    // explicit relatedCommandIndex.
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
        visited,
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
  depth: number,
): boolean {
  // Placeholder rows are kept only at the root so the loading state still
  // renders; nested invocations whose journal hasn't loaded are dropped.
  if (!entry) {
    return depth === 0;
  }

  // Group entries are produced by the API (futureEntries.ts) but not
  // rendered in the timeline; their children appear in chronological order
  // at the top level.
  if (entry.category === 'group') {
    return false;
  }
  // Raw completion events are internal — results land on the command via
  // relatedEntries instead.
  if (entry.category === 'event' && entry.type === 'Completion') {
    return false;
  }
  // CallInvocationId notifications are an implementation detail.
  if (entry.category === 'notification' && entry.type === 'CallInvocationId') {
    return false;
  }
  // Compact mode hides notifications already represented by their parent
  // command, plus transient retry errors.
  if (
    isCompact &&
    ((parentCommand && entry.category === 'notification') ||
      entry.type === 'Event: TransientError')
  ) {
    return false;
  }
  // Paused and Suspended raw events live in the lifecycle viewer (transformed
  // into Paused/Suspended lifecycle entries by lifeCycles.ts), not the main
  // list.
  if (
    entry.category === 'event' &&
    (entry.type === 'Event: Paused' || entry.type === 'Event: Suspended')
  ) {
    return false;
  }
  return true;
}

// Flattens the multi-invocation journal into a single ordered list ready
// for rendering: preprocess once per invocation, then walk the call graph
// depth-first, filtering and extracting the root Input along the way.
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

    // Preprocess every loaded invocation up front; the recursion below
    // then does O(1) lookups per visit.
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

    // Only the *root* invocation's Input is surfaced; nested invocations'
    // Inputs are dropped from the timeline.
    let inputEntry: JournalEntryV2 | undefined;
    const entriesWithoutInput: CombinedJournalEntry[] = [];

    for (const combinedEntry of allCombinedEntries) {
      if (
        !shouldIncludeEntry(
          combinedEntry.entry,
          combinedEntry.parentCommand,
          isCompact,
          combinedEntry.depth,
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
