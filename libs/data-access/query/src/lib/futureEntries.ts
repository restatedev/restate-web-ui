import type {
  components,
  Invocation,
  InvocationFuture,
  JournalEntryV2,
} from '@restate/data-access/admin-api-spec';
import {
  assignGroupIds,
  type GroupIds,
  type JournalEntryConversionContext,
} from '@restate/features/service-protocol';

type SignalNotificationEntry = Extract<
  JournalEntryV2,
  { type?: 'Signal'; category?: 'notification' }
>;
type CompleteAwakeableNotificationEntry = Extract<
  JournalEntryV2,
  { type?: 'CompleteAwakeable'; category?: 'notification' }
>;
type JournalGroupEntry = components['schemas']['JournalGroupEntryV2'] &
  Pick<JournalEntryV2, 'groupIds' | 'index' | 'relatedIndexes'>;
type FutureGroupType = NonNullable<JournalGroupEntry['type']>;
type FutureGroupKey =
  | 'Attempt'
  | 'FirstCompleted'
  | 'AllCompleted'
  | 'FirstSucceededOrAllFailed'
  | 'AllSucceededOrFirstFailed'
  | 'Unknown';
type FutureSignalNameRef = {
  signalName: string;
  groupIds: GroupIds;
};
type FutureChildRef =
  | { kind: 'group'; groupId: string }
  | { kind: 'completion'; completionId: number }
  | { kind: 'signalIndex'; signalIndex: number }
  | { kind: 'signalName'; ref: FutureSignalNameRef };
type FutureEntriesCollection = {
  groupEntries: JournalGroupEntry[];
  childRefsByGroupId: Map<string, FutureChildRef[]>;
  completionRefs: [number, GroupIds][];
  signalIndexRefs: [number, GroupIds][];
  signalNameRefs: FutureSignalNameRef[];
};

export type FutureEntriesRegistry = {
  groupEntries: JournalGroupEntry[];
  childRefsByGroupId: Map<string, FutureChildRef[]>;
  completionGroupIdsById: Map<number, GroupIds>;
  signalIndexGroupIdsByIndex: Map<number, GroupIds>;
  signalNameRefs: FutureSignalNameRef[];
};
type AllocateSyntheticIndex = () => number;

function getFutureGroup(
  future: InvocationFuture,
): { type: FutureGroupType; children: InvocationFuture[] } | undefined {
  const futureRecord = future as Partial<Record<FutureGroupKey, unknown>>;

  for (const type of [
    'Attempt',
    'FirstCompleted',
    'AllCompleted',
    'FirstSucceededOrAllFailed',
    'AllSucceededOrFirstFailed',
    'Unknown',
  ] as const satisfies FutureGroupKey[]) {
    const children = futureRecord[type];
    if (Array.isArray(children)) {
      return { type, children: children as InvocationFuture[] };
    }
  }

  return undefined;
}

function getSingleFutureReference(
  future: InvocationFuture,
  groupIds: GroupIds,
): FutureChildRef | undefined {
  const single = (future as { Single?: unknown }).Single;
  if (!single || typeof single !== 'object') {
    return undefined;
  }

  const singleRecord = single as {
    CompletionId?: unknown;
    SignalIndex?: unknown;
    SignalName?: unknown;
  };

  if (typeof singleRecord.CompletionId === 'number') {
    return { kind: 'completion', completionId: singleRecord.CompletionId };
  }
  if (
    typeof singleRecord.SignalIndex === 'number' &&
    singleRecord.SignalIndex >= 17
  ) {
    return { kind: 'signalIndex', signalIndex: singleRecord.SignalIndex };
  }
  if (
    typeof singleRecord.SignalName === 'string' &&
    singleRecord.SignalName.length > 0
  ) {
    return {
      kind: 'signalName',
      ref: { signalName: singleRecord.SignalName, groupIds },
    };
  }
  return undefined;
}

function collectFutureEntries(
  future: InvocationFuture,
  id: string,
  collection: FutureEntriesCollection,
): FutureEntriesCollection {
  const group = getFutureGroup(future);
  if (!group) {
    const ref = getSingleFutureReference(future, {});
    if (ref) {
      addFutureReference(collection, ref, {});
    }
    return collection;
  }

  const groupEntry = {
    category: 'group',
    type: group.type,
    id,
  } as JournalGroupEntry;
  collection.groupEntries.push(groupEntry);
  const childRefs: FutureChildRef[] = [];
  collection.childRefsByGroupId.set(id, childRefs);
  const groupIds: GroupIds = { [id]: true };

  for (const [index, child] of group.children.entries()) {
    if (!child) {
      continue;
    }

    const childGroup = getFutureGroup(child);
    if (childGroup) {
      const childGroupId = `${id}-${index}`;
      childRefs.push({ kind: 'group', groupId: childGroupId });
      const childGroupIndex = collection.groupEntries.length;
      collectFutureEntries(child, childGroupId, collection);
      const childGroupEntry = collection.groupEntries[childGroupIndex];
      if (childGroupEntry) {
        childGroupEntry.groupIds = groupIds;
      }
      continue;
    }

    const ref = getSingleFutureReference(child, groupIds);
    if (ref) {
      childRefs.push(ref);
      addFutureReference(collection, ref, groupIds);
    }
  }

  return collection;
}

function addFutureReference(
  collection: FutureEntriesCollection,
  ref: FutureChildRef,
  groupIds: GroupIds,
) {
  switch (ref.kind) {
    case 'completion':
      collection.completionRefs.push([ref.completionId, groupIds]);
      break;
    case 'signalIndex':
      collection.signalIndexRefs.push([ref.signalIndex, groupIds]);
      break;
    case 'signalName':
      collection.signalNameRefs.push(ref.ref);
      break;
  }
}

function collectGroupIdsByReference<Key>(references: [Key, GroupIds][]) {
  const groupIdsByKey = new Map<Key, GroupIds>();
  for (const [key, groupIds] of references) {
    groupIdsByKey.set(key, { ...groupIdsByKey.get(key), ...groupIds });
  }
  return groupIdsByKey;
}

export function createFutureEntriesRegistry(
  invocation: Invocation,
): FutureEntriesRegistry | undefined {
  const future =
    invocation.last_awaiting_on_future_json ??
    invocation.suspended_waiting_future_json;
  if (!future) {
    return undefined;
  }

  const collection = collectFutureEntries(
    future,
    invocation.last_awaiting_on_future_json
      ? 'future-last-awaiting'
      : 'future-suspended-waiting',
    {
      groupEntries: [],
      childRefsByGroupId: new Map<string, FutureChildRef[]>(),
      completionRefs: [],
      signalIndexRefs: [],
      signalNameRefs: [],
    },
  );

  if (
    collection.groupEntries.length === 0 &&
    collection.completionRefs.length === 0 &&
    collection.signalIndexRefs.length === 0 &&
    collection.signalNameRefs.length === 0
  ) {
    return undefined;
  }

  return {
    groupEntries: collection.groupEntries,
    childRefsByGroupId: collection.childRefsByGroupId,
    completionGroupIdsById: collectGroupIdsByReference(
      collection.completionRefs,
    ),
    signalIndexGroupIdsByIndex: collectGroupIdsByReference(
      collection.signalIndexRefs,
    ),
    signalNameRefs: collection.signalNameRefs,
  };
}

function createPendingSignalIndexEntry(
  index: number,
  signalIndexGroupIds: GroupIds,
): CompleteAwakeableNotificationEntry {
  return {
    isPending: true,
    isAwaitingOn: true,
    groupIds: signalIndexGroupIds,
    commandIndex: undefined,
    type: 'CompleteAwakeable',
    category: 'notification',
    completionId: undefined,
    end: undefined,
    relatedIndexes: undefined,
    isRetrying: false,
    isLoaded: true,
    error: undefined,
    value: undefined,
    resultType: undefined,
    index,
    id: undefined,
  } as CompleteAwakeableNotificationEntry;
}

function createPendingSignalNameEntry(
  index: number,
  signalName: string,
  signalNameGroupIds: GroupIds,
): SignalNotificationEntry {
  return {
    isPending: true,
    isAwaitingOn: true,
    groupIds: signalNameGroupIds,
    commandIndex: undefined,
    type: 'Signal',
    category: 'notification',
    completionId: undefined,
    end: undefined,
    relatedIndexes: undefined,
    isRetrying: false,
    isLoaded: true,
    error: undefined,
    value: undefined,
    resultType: undefined,
    index,
    signalName,
  } as SignalNotificationEntry;
}

function createPendingSignalEntries(
  registry: FutureEntriesRegistry,
  context: JournalEntryConversionContext,
  allocateSyntheticIndex: AllocateSyntheticIndex,
) {
  const pendingEntries: JournalEntryV2[] = [];
  const signalIndexEntryByIndex = new Map<number, JournalEntryV2>();
  const signalNameEntryByRef = new Map<FutureSignalNameRef, JournalEntryV2>();

  for (const [signalIndex, groupIds] of registry.signalIndexGroupIdsByIndex) {
    const signalEntry = context.signalEntryByIndex.get(signalIndex);
    if (signalEntry) {
      signalIndexEntryByIndex.set(signalIndex, signalEntry);
    } else {
      const pendingEntry = createPendingSignalIndexEntry(
        allocateSyntheticIndex(),
        groupIds,
      );
      pendingEntries.push(pendingEntry);
      signalIndexEntryByIndex.set(signalIndex, pendingEntry);
    }
  }

  const signalNameRefCount = new Map<string, number>();
  for (const ref of registry.signalNameRefs) {
    const index = signalNameRefCount.get(ref.signalName) ?? 0;
    signalNameRefCount.set(ref.signalName, index + 1);

    const signalEntry = context.signalEntriesByName.get(ref.signalName)?.[
      index
    ];
    if (signalEntry) {
      signalEntry.isAwaitingOn = true;
      assignGroupIds(signalEntry, ref.groupIds);
      signalNameEntryByRef.set(ref, signalEntry);
    } else {
      const pendingEntry = createPendingSignalNameEntry(
        allocateSyntheticIndex(),
        ref.signalName,
        ref.groupIds,
      );
      pendingEntries.push(pendingEntry);
      signalNameEntryByRef.set(ref, pendingEntry);
    }
  }

  return { pendingEntries, signalIndexEntryByIndex, signalNameEntryByRef };
}

export function createFutureEntries(
  registry: FutureEntriesRegistry | undefined,
  context: JournalEntryConversionContext,
  allocateSyntheticIndex: AllocateSyntheticIndex,
): JournalEntryV2[] {
  if (!registry) {
    return [];
  }

  for (const groupEntry of registry.groupEntries) {
    groupEntry.index = allocateSyntheticIndex();
  }

  const { pendingEntries, signalIndexEntryByIndex, signalNameEntryByRef } =
    createPendingSignalEntries(registry, context, allocateSyntheticIndex);
  const groupEntryById = new Map(
    registry.groupEntries.map((entry) => [entry.id, entry]),
  );

  for (const groupEntry of registry.groupEntries) {
    const relatedIndexes: number[] = [];

    for (const ref of registry.childRefsByGroupId.get(groupEntry.id) ?? []) {
      const relatedIndex = getFutureReferenceIndex(
        ref,
        context,
        groupEntryById,
        signalIndexEntryByIndex,
        signalNameEntryByRef,
      );
      if (typeof relatedIndex === 'number') {
        relatedIndexes.push(relatedIndex);
      }
    }

    groupEntry.relatedIndexes = relatedIndexes;
  }

  return [...registry.groupEntries, ...pendingEntries];
}

function getFutureReferenceIndex(
  ref: FutureChildRef,
  context: JournalEntryConversionContext,
  groupEntryById: Map<string, JournalGroupEntry>,
  signalIndexEntryByIndex: Map<number, JournalEntryV2>,
  signalNameEntryByRef: Map<FutureSignalNameRef, JournalEntryV2>,
) {
  switch (ref.kind) {
    case 'group':
      return groupEntryById.get(ref.groupId)?.index;
    case 'completion':
      return context.completionEntryById.get(ref.completionId)?.index;
    case 'signalIndex':
      return signalIndexEntryByIndex.get(ref.signalIndex)?.index;
    case 'signalName':
      return signalNameEntryByRef.get(ref.ref)?.index;
  }
}
