import type {
  AttachInvocationJournalEntryType,
  AwakeableJournalEntryType,
  CallJournalEntryType,
  CancelInvocationJournalEntryType,
  ClearAllStateJournalEntryType,
  ClearStateJournalEntryType,
  CompleteAwakeableJournalEntryType,
  CompletePromiseJournalEntryType,
  CustomJournalEntryType,
  EntryType,
  GetCallInvocationIdJournalEntryType,
  GetInvocationOutputJournalEntryType,
  GetPromiseJournalEntryType,
  GetStateJournalEntryType,
  GetStateKeysJournalEntryType,
  InputJournalEntryType,
  JournalEntry,
  JournalRawEntry,
  OneWayCallJournalEntryType,
  OutputJournalEntryType,
  PeekPromiseJournalEntryType,
  RunJournalEntryType,
  SetStateJournalEntryType,
  SleepJournalEntryType,
} from '@restate/data-access/admin-api/spec';
import {
  getState,
  getStateKeys,
  input,
  run,
  setState,
  clearAllState,
  clearState,
  call,
  sleep,
  oneWayCall,
  awakeable,
  completeAwakeable,
  completePromise,
  getPromise,
  peekPromise,
  output,
} from '@restate/features/service-protocol';

export function convertJournal(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
): JournalEntry {
  /**
   * TODO:
   * In v2 journal the entry type in in the format of Command/Notification: {name}
   * For now we remove the Command but need to revisit this.
   */

  const command_index =
    entry.version && entry.version >= 2
      ? entry.entry_type.startsWith('Command: ')
        ? allEntries
            .slice(0, entry.index)
            .filter((entry) => entry.entry_type.startsWith('Command: ')).length
        : undefined
      : entry.index;
  const newEntry =
    JOURNAL_ENTRY_CONVERT_MAP[
      entry.entry_type.replace('Command: ', '') as EntryType
    ]?.(entry, allEntries) ?? (entry as JournalEntry);
  return {
    ...newEntry,
    command_index,
    version: entry.version ?? 1,
  };
}

function GetState(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
): GetStateJournalEntryType {
  const entryMessage = getState(entry, allEntries);

  return {
    entry_type: 'GetState',
    index: entry.index,
    ...entryMessage,
  };
}

function GetStateKeys(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
): GetStateKeysJournalEntryType {
  const entryMessage = getStateKeys(entry, allEntries);
  return {
    entry_type: 'GetStateKeys',
    index: entry.index,
    ...entryMessage,
  };
}

const JOURNAL_ENTRY_CONVERT_MAP: Record<
  EntryType,
  (entry: JournalRawEntry, allEntries: JournalRawEntry[]) => JournalEntry
> = {
  Input: function (
    entry: JournalRawEntry,
    allEntries: JournalRawEntry[]
  ): InputJournalEntryType {
    const entryMessage = input(entry, allEntries);
    return {
      ...entryMessage,
      entry_type: 'Input',
      index: entry.index,
    };
  },
  Output: function (
    entry: JournalRawEntry,
    allEntries: JournalRawEntry[]
  ): OutputJournalEntryType {
    const entryMessage = output(entry, allEntries);
    return {
      entry_type: 'Output',
      index: entry.index,
      ...entryMessage,
    };
  },
  GetState,
  GetEagerState: GetState,

  SetState: function (
    entry: JournalRawEntry,
    allEntries: JournalRawEntry[]
  ): SetStateJournalEntryType {
    const entryMessage = setState(entry, allEntries);

    return {
      entry_type: 'SetState',
      index: entry.index,
      ...entryMessage,
    };
  },
  GetStateKeys,
  GetEagerStateKeys: GetStateKeys,
  ClearState: function (
    entry: JournalRawEntry,
    allEntries: JournalRawEntry[]
  ): ClearStateJournalEntryType {
    const entryMessage = clearState(entry, allEntries);
    return {
      entry_type: 'ClearState',
      index: entry.index,
      ...entryMessage,
    };
  },
  ClearAllState: function (
    entry: JournalRawEntry,
    allEntries: JournalRawEntry[]
  ): ClearAllStateJournalEntryType {
    const entryMessage = clearAllState(entry, allEntries);

    return {
      entry_type: 'ClearAllState',
      index: entry.index,
      ...entryMessage,
    };
  },
  Sleep: function (
    entry: JournalRawEntry,
    allEntries: JournalRawEntry[]
  ): SleepJournalEntryType {
    const entryMessage = sleep(entry, allEntries);
    return {
      entry_type: 'Sleep',
      index: entry.index,
      ...entryMessage,
    };
  },
  GetPromise: function (
    entry: JournalRawEntry,
    allEntries: JournalRawEntry[]
  ): GetPromiseJournalEntryType {
    const entryMessage = getPromise(entry, allEntries);

    return {
      entry_type: 'GetPromise',
      index: entry.index,
      ...entryMessage,
    };
  },
  PeekPromise: function (
    entry: JournalRawEntry,
    allEntries: JournalRawEntry[]
  ): PeekPromiseJournalEntryType {
    const entryMessage = peekPromise(entry, allEntries);

    return {
      entry_type: 'PeekPromise',
      index: entry.index,
      ...entryMessage,
    };
  },
  CompletePromise: function (
    entry: JournalRawEntry,
    allEntries: JournalRawEntry[]
  ): CompletePromiseJournalEntryType {
    const entryMessage = completePromise(entry, allEntries);

    return {
      entry_type: 'CompletePromise',
      index: entry.index,
      ...entryMessage,
    };
  },
  OneWayCall: function (
    entry: JournalRawEntry,
    allEntries: JournalRawEntry[]
  ): OneWayCallJournalEntryType {
    const entryMessage = oneWayCall(entry, allEntries);

    return {
      entry_type: 'OneWayCall',
      index: entry.index,
      ...entryMessage,
    };
  },
  Call: function (
    entry: JournalRawEntry,
    allEntries: JournalRawEntry[]
  ): CallJournalEntryType {
    const entryMessage = call(entry, allEntries);

    return {
      entry_type: 'Call',
      index: entry.index,
      ...entryMessage,
    };
  },
  Awakeable: function (
    entry: JournalRawEntry,
    allEntries: JournalRawEntry[]
  ): AwakeableJournalEntryType {
    const entryMessage = awakeable(entry, allEntries);

    return {
      entry_type: 'Awakeable',
      index: entry.index,
      ...entryMessage,
    };
  },
  CompleteAwakeable: function (
    entry: JournalRawEntry,
    allEntries: JournalRawEntry[]
  ): CompleteAwakeableJournalEntryType {
    const entryMessage = completeAwakeable(entry, allEntries);

    return {
      entry_type: 'CompleteAwakeable',
      index: entry.index,
      ...entryMessage,
    };
  },
  Run: function (
    entry: JournalRawEntry,
    allEntries: JournalRawEntry[]
  ): RunJournalEntryType {
    const entryMessage = run(entry, allEntries);

    return {
      ...entryMessage,
      entry_type: 'Run',
      index: entry.index,
      name: entryMessage.name ?? '',
    };
  },
  CancelInvocation: function (
    entry: JournalRawEntry
  ): CancelInvocationJournalEntryType {
    return {
      entry_type: 'CancelInvocation',
      index: entry.index,
    };
  },
  GetCallInvocationId: function (
    entry: JournalRawEntry
  ): GetCallInvocationIdJournalEntryType {
    return {
      entry_type: 'GetCallInvocationId',
      index: entry.index,
    };
  },
  AttachInvocation: function (
    entry: JournalRawEntry
  ): AttachInvocationJournalEntryType {
    return {
      entry_type: 'AttachInvocation',
      index: entry.index,
    };
  },
  GetInvocationOutput: function (
    entry: JournalRawEntry
  ): GetInvocationOutputJournalEntryType {
    return {
      entry_type: 'GetInvocationOutput',
      index: entry.index,
    };
  },
  Custom: function (
    entry: JournalRawEntry,
    allEntries: JournalRawEntry[]
  ): CustomJournalEntryType {
    return {
      entry_type: 'Custom',
      index: entry.index,
    };
  },
};
