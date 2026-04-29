import type {
  Invocation,
  InvocationFuture,
  JournalEntryV2,
} from '@restate/data-access/admin-api-spec';
import type { JournalEntryConversionContext } from '@restate/features/service-protocol';

type SignalNotificationEntry = Extract<
  JournalEntryV2,
  { type?: 'Signal'; category?: 'notification' }
>;
type CompleteAwakeableNotificationEntry = Extract<
  JournalEntryV2,
  { type?: 'CompleteAwakeable'; category?: 'notification' }
>;

const FUTURE_CHILD_KEYS = [
  'FirstCompleted',
  'AllCompleted',
  'FirstSucceededOrAllFailed',
  'AllSucceededOrFirstFailed',
  'Unknown',
] as const;

type FutureChildKey = (typeof FUTURE_CHILD_KEYS)[number];

type MissingSignal =
  | { sequence: number; signalIndex: number; signalName?: never }
  | { sequence: number; signalName: string; signalIndex?: never };

function getFutureChildren(
  future: InvocationFuture,
): InvocationFuture[] | undefined {
  const futureRecord = future as Partial<Record<FutureChildKey, unknown>>;

  for (const key of FUTURE_CHILD_KEYS) {
    const children = futureRecord[key];
    if (Array.isArray(children)) {
      return children as InvocationFuture[];
    }
  }

  return undefined;
}

function collectRequiredSignals(invocation: Invocation) {
  const requiredSignalIndexes = new Set<number>();
  const requiredSignalNameCounts = new Map<string, number>();

  const roots = [
    invocation.last_awaiting_on_future_json,
    invocation.suspended_waiting_future_json,
  ].filter((future): future is InvocationFuture => Boolean(future));

  const stack = [...roots].reverse();

  while (stack.length > 0) {
    const future = stack.pop()!;
    const children = getFutureChildren(future);
    if (children) {
      for (let index = children.length - 1; index >= 0; index--) {
        stack.push(children[index]!);
      }
      continue;
    }

    const single = (future as { Single?: unknown }).Single;
    if (!single || typeof single !== 'object') {
      continue;
    }

    const singleRecord = single as {
      SignalIndex?: unknown;
      SignalName?: unknown;
    };

    if (
      typeof singleRecord.SignalIndex === 'number' &&
      singleRecord.SignalIndex >= 17
    ) {
      requiredSignalIndexes.add(singleRecord.SignalIndex);
    }

    if (
      typeof singleRecord.SignalName === 'string' &&
      singleRecord.SignalName.length > 0
    ) {
      requiredSignalNameCounts.set(
        singleRecord.SignalName,
        (requiredSignalNameCounts.get(singleRecord.SignalName) ?? 0) + 1,
      );
    }
  }

  return { requiredSignalIndexes, requiredSignalNameCounts };
}

function getMissingSignals(
  invocation: Invocation,
  context: JournalEntryConversionContext,
): MissingSignal[] {
  const { requiredSignalIndexes, requiredSignalNameCounts } =
    collectRequiredSignals(invocation);
  const missingSignals: MissingSignal[] = [];
  let sequence = 0;

  for (const signalIndex of requiredSignalIndexes) {
    if (!context.signalIndexes.has(signalIndex)) {
      missingSignals.push({ sequence: sequence++, signalIndex });
    }
  }

  for (const [signalName, requiredCount] of requiredSignalNameCounts) {
    const existingCount = context.signalNameCounts.get(signalName) ?? 0;
    for (let count = existingCount; count < requiredCount; count++) {
      missingSignals.push({ sequence: sequence++, signalName });
    }
  }

  return missingSignals;
}

function createPendingSignalEntry(
  missingSignal: MissingSignal,
): SignalNotificationEntry | CompleteAwakeableNotificationEntry {
  if (typeof missingSignal.signalIndex === 'number') {
    return {
      isPending: true,
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

  return {
    isPending: true,
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
    signalName: missingSignal.signalName,
  } as SignalNotificationEntry;
}

export function injectPendingSignalNotifications(
  entries: JournalEntryV2[],
  invocation: Invocation,
  context: JournalEntryConversionContext,
): JournalEntryV2[] {
  if (
    !invocation.last_awaiting_on_future_json &&
    !invocation.suspended_waiting_future_json
  ) {
    return entries;
  }

  const missingSignals = getMissingSignals(invocation, context);
  if (missingSignals.length === 0) {
    return entries;
  }

  return [
    ...entries,
    ...missingSignals.map((missingSignal) =>
      createPendingSignalEntry(missingSignal),
    ),
  ];
}
