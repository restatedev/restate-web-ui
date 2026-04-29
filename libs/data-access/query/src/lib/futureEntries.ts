import type {
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
type JournalGroupEntry = Extract<JournalEntryV2, { category?: 'group' }>;
type FutureGroupType = NonNullable<JournalGroupEntry['type']>;
type FutureGroupKey =
  | 'Attempt'
  | 'FirstCompleted'
  | 'AllCompleted'
  | 'FirstSucceededOrAllFailed'
  | 'AllSucceededOrFirstFailed'
  | 'Unknown';
type FutureEntriesCollection = {
  groupEntries: JournalGroupEntry[];
  completionRefs: [number, GroupIds][];
  signalIndexRefs: [number, GroupIds][];
  signalNameRefs: [string, GroupIds][];
};

export type FutureEntriesRegistry = {
  groupEntries: JournalGroupEntry[];
  completionGroupIdsById: Map<number, GroupIds>;
  signalIndexGroupIdsByIndex: Map<number, GroupIds>;
  signalNameGroupIdsByName: Map<string, GroupIds[]>;
};

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

function collectSingleFutureReferences(
  future: InvocationFuture,
  groupIds: GroupIds,
): FutureEntriesCollection {
  const single = (future as { Single?: unknown }).Single;
  if (!single || typeof single !== 'object') {
    return {
      groupEntries: [],
      completionRefs: [],
      signalIndexRefs: [],
      signalNameRefs: [],
    };
  }

  const singleRecord = single as {
    CompletionId?: unknown;
    SignalIndex?: unknown;
    SignalName?: unknown;
  };

  return {
    groupEntries: [],
    completionRefs:
      typeof singleRecord.CompletionId === 'number'
        ? [[singleRecord.CompletionId, groupIds]]
        : [],
    signalIndexRefs:
      typeof singleRecord.SignalIndex === 'number' &&
      singleRecord.SignalIndex >= 17
        ? [[singleRecord.SignalIndex, groupIds]]
        : [],
    signalNameRefs:
      typeof singleRecord.SignalName === 'string' &&
      singleRecord.SignalName.length > 0
        ? [[singleRecord.SignalName, groupIds]]
        : [],
  };
}

function collectFutureEntries(
  future: InvocationFuture,
  id: string,
): FutureEntriesCollection {
  const group = getFutureGroup(future);
  if (!group) {
    return collectSingleFutureReferences(future, {});
  }

  const collection: FutureEntriesCollection = {
    groupEntries: [
      {
        category: 'group',
        type: group.type,
        id,
      } as JournalGroupEntry,
    ],
    completionRefs: [],
    signalIndexRefs: [],
    signalNameRefs: [],
  };
  const groupIds: GroupIds = { [id]: true };

  for (const [index, child] of group.children.entries()) {
    if (!child) {
      continue;
    }

    const childGroup = getFutureGroup(child);
    const childCollection = childGroup
      ? collectFutureEntries(child, `${id}-${index}`)
      : collectSingleFutureReferences(child, groupIds);

    for (const [
      groupIndex,
      groupEntry,
    ] of childCollection.groupEntries.entries()) {
      collection.groupEntries.push(
        groupIndex === 0 && childGroup
          ? ({ ...groupEntry, groupIds } as JournalGroupEntry)
          : groupEntry,
      );
    }
    for (const completionRef of childCollection.completionRefs) {
      collection.completionRefs.push(completionRef);
    }
    for (const signalIndexRef of childCollection.signalIndexRefs) {
      collection.signalIndexRefs.push(signalIndexRef);
    }
    for (const signalNameRef of childCollection.signalNameRefs) {
      collection.signalNameRefs.push(signalNameRef);
    }
  }

  return collection;
}

function collectGroupIdsByReference<Key>(references: [Key, GroupIds][]) {
  const groupIdsByKey = new Map<Key, GroupIds>();
  for (const [key, groupIds] of references) {
    groupIdsByKey.set(key, { ...groupIdsByKey.get(key), ...groupIds });
  }
  return groupIdsByKey;
}

function collectSignalNameReferences(references: [string, GroupIds][]) {
  const groupIdsBySignalName = new Map<string, GroupIds[]>();
  for (const [signalName, groupIds] of references) {
    groupIdsBySignalName.set(signalName, [
      ...(groupIdsBySignalName.get(signalName) ?? []),
      groupIds,
    ]);
  }
  return groupIdsBySignalName;
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
    completionGroupIdsById: collectGroupIdsByReference(
      collection.completionRefs,
    ),
    signalIndexGroupIdsByIndex: collectGroupIdsByReference(
      collection.signalIndexRefs,
    ),
    signalNameGroupIdsByName: collectSignalNameReferences(
      collection.signalNameRefs,
    ),
  };
}

function createPendingSignalIndexEntry(
  signalIndexGroupIds: GroupIds,
): CompleteAwakeableNotificationEntry {
  return {
    isPending: true,
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
    id: undefined,
  } as CompleteAwakeableNotificationEntry;
}

function createPendingSignalNameEntry(
  signalName: string,
  signalNameGroupIds: GroupIds,
): SignalNotificationEntry {
  return {
    isPending: true,
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
    signalName,
  } as SignalNotificationEntry;
}

function createPendingSignalEntries(
  registry: FutureEntriesRegistry,
  context: JournalEntryConversionContext,
) {
  const pendingEntries: JournalEntryV2[] = [];

  for (const [signalIndex, groupIds] of registry.signalIndexGroupIdsByIndex) {
    if (!context.signalEntryByIndex.has(signalIndex)) {
      pendingEntries.push(createPendingSignalIndexEntry(groupIds));
    }
  }

  for (const [
    signalName,
    signalGroupIds,
  ] of registry.signalNameGroupIdsByName) {
    const signalEntries = context.signalEntriesByName.get(signalName) ?? [];

    for (const [index, entry] of signalEntries.entries()) {
      const groupIds = signalGroupIds[index];
      if (entry) {
        assignGroupIds(entry, groupIds);
      }
    }

    for (const groupIds of signalGroupIds.slice(signalEntries.length)) {
      pendingEntries.push(
        createPendingSignalNameEntry(signalName, groupIds),
      );
    }
  }

  return pendingEntries;
}

export function createFutureEntries(
  registry: FutureEntriesRegistry | undefined,
  context: JournalEntryConversionContext,
): JournalEntryV2[] {
  if (!registry) {
    return [];
  }

  return [
    ...registry.groupEntries,
    ...createPendingSignalEntries(registry, context),
  ];
}
