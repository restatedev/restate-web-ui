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
} from '@restate/data-access/admin-api';
import { convertToUTC } from './convertToUTC';
import {
  awakeable,
  call,
  clearState,
  completeAwakeable,
  completePromise,
  getPromise,
  getState,
  getStateKeys,
  input,
  oneWayCall,
  output,
  peekPromise,
  run,
  setState,
  sleep,
} from '@restate/service-protocol';

export function convertJournal(entry: JournalRawEntry): JournalEntry {
  return (
    JOURNAL_ENTRY_CONVERT_MAP[entry.entry_type](entry) ??
    (entry as JournalEntry)
  );
}

const JOURNAL_ENTRY_CONVERT_MAP: Record<
  EntryType,
  (entry: JournalRawEntry) => JournalEntry
> = {
  Input: function (entry: JournalRawEntry): InputJournalEntryType {
    const entryMessage = input(entry.raw);
    return {
      entry_type: 'Input',
      index: entry.index,
      body: entryMessage.body,
      headers: entryMessage.headers,
    };
  },
  Output: function (entry: JournalRawEntry): OutputJournalEntryType {
    const entryMessage = output(entry.raw);
    return {
      entry_type: 'Output',
      index: entry.index,
      value: entryMessage.value,
      failure: entryMessage.failure,
    };
  },
  GetState: function (entry: JournalRawEntry): GetStateJournalEntryType {
    const entryMessage = getState(entry.raw);

    return {
      entry_type: 'GetState',
      index: entry.index,
      failure: entryMessage.failure,
      key: entryMessage.key,
      value: entryMessage.value,
      completed: entry.completed,
    };
  },
  SetState: function (entry: JournalRawEntry): SetStateJournalEntryType {
    const entryMessage = setState(entry.raw);

    return {
      entry_type: 'SetState',
      index: entry.index,
      key: entryMessage.key,
      value: entryMessage.value,
    };
  },
  GetStateKeys: function (
    entry: JournalRawEntry
  ): GetStateKeysJournalEntryType {
    const entryMessage = getStateKeys(entry.raw);
    return {
      entry_type: 'GetStateKeys',
      index: entry.index,
      completed: entry.completed,
      keys: entryMessage.keys,
      failure: entryMessage.failure,
    };
  },
  ClearState: function (entry: JournalRawEntry): ClearStateJournalEntryType {
    const entryMessage = clearState(entry.raw);
    return {
      entry_type: 'ClearState',
      index: entry.index,
      key: entryMessage.key,
    };
  },
  ClearAllState: function (
    entry: JournalRawEntry
  ): ClearAllStateJournalEntryType {
    return {
      entry_type: 'ClearAllState',
      index: entry.index,
    };
  },
  Sleep: function (entry: JournalRawEntry): SleepJournalEntryType {
    const entryMessage = sleep(entry.raw);
    return {
      entry_type: 'Sleep',
      index: entry.index,
      sleep_wakeup_at: convertToUTC(entry.sleep_wakeup_at)!,
      completed: entry.completed,
      failure: entryMessage.failure,
    };
  },
  GetPromise: function (entry: JournalRawEntry): GetPromiseJournalEntryType {
    const entryMessage = getPromise(entry.raw);

    return {
      entry_type: 'GetPromise',
      index: entry.index,
      promise_name: entry.promise_name!,
      completed: entry.completed,
      failure: entryMessage.failure,
      value: entryMessage.value,
    };
  },
  PeekPromise: function (entry: JournalRawEntry): PeekPromiseJournalEntryType {
    const entryMessage = peekPromise(entry.raw);

    return {
      entry_type: 'PeekPromise',
      index: entry.index,
      promise_name: entry.promise_name!,
      completed: entry.completed,
      failure: entryMessage.failure,
      value: entryMessage.value,
    };
  },
  CompletePromise: function (
    entry: JournalRawEntry
  ): CompletePromiseJournalEntryType {
    const entryMessage = completePromise(entry.raw);

    return {
      entry_type: 'CompletePromise',
      index: entry.index,
      promise_name: entry.promise_name!,
      completed: entry.completed,
      failure: entryMessage.failure,
      completion: entryMessage.completion,
    };
  },
  OneWayCall: function (entry: JournalRawEntry): OneWayCallJournalEntryType {
    const entryMessage = oneWayCall(entry.raw);

    return {
      entry_type: 'OneWayCall',
      index: entry.index,
      invoked_id: entry.invoked_id!,
      invoked_target: entry.invoked_target!,
      key: entryMessage.key,
      serviceName: entryMessage.serviceName,
      handlerName: entryMessage.handlerName,
      headers: entryMessage.headers,
      parameters: entryMessage.parameters,
      invokeTime: entryMessage.invokeTime,
    };
  },
  Call: function (entry: JournalRawEntry): CallJournalEntryType {
    const entryMessage = call(entry.raw);

    return {
      entry_type: 'Call',
      index: entry.index,
      invoked_id: entry.invoked_id!,
      invoked_target: entry.invoked_target!,
      completed: entry.completed,
      key: entryMessage.key,
      serviceName: entryMessage.serviceName,
      handlerName: entryMessage.handlerName,
      headers: entryMessage.headers,
      parameters: entryMessage.parameters,
      failure: entryMessage.failure,
      value: entryMessage.value,
    };
  },
  Awakeable: function (entry: JournalRawEntry): AwakeableJournalEntryType {
    const entryMessage = awakeable(entry.raw);

    return {
      entry_type: 'Awakeable',
      index: entry.index,
      completed: entry.completed,
      value: entryMessage.value,
      failure: entryMessage.failure,
    };
  },
  CompleteAwakeable: function (
    entry: JournalRawEntry
  ): CompleteAwakeableJournalEntryType {
    const entryMessage = completeAwakeable(entry.raw);

    return {
      entry_type: 'CompleteAwakeable',
      index: entry.index,
      id: entryMessage.id,
      value: entryMessage.value,
      failure: entryMessage.failure,
    };
  },
  Run: function (entry: JournalRawEntry): RunJournalEntryType {
    const entryMessage = run(entry.raw);

    return {
      entry_type: 'Run',
      index: entry.index,
      name: entry.name!,
      value: entryMessage.value,
      failure: entryMessage.failure,
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
  Custom: function (entry: JournalRawEntry): CustomJournalEntryType {
    return {
      entry_type: 'Custom',
      index: entry.index,
    };
  },
};
