import type {
  Invocation,
  JournalEntryV2,
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
  signal,
  attachInvocation,
  JournalRawEntryWithCommandIndex,
  sendSignal,
  event,
  notificationRun,
  notificationCompletePromise,
  notificationPeekPromise,
  notificationGetPromise,
  notificationAttachInvocation,
  notificationCall,
  notificationSleep,
  notificationCallInvocationId,
} from '@restate/features/service-protocol';

export function convertJournalV2(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation
): JournalEntryV2 {
  const newEntry =
    JOURNAL_ENTRY_CONVERT_MAP[entry.entry_type]?.(
      entry,
      nextEntries,
      invocation
    ) ?? (entry as JournalEntryV2);
  return newEntry;
}

const JOURNAL_ENTRY_CONVERT_MAP: Partial<
  Record<
    JournalRawEntryWithCommandIndex['entry_type'],
    (
      entry: JournalRawEntryWithCommandIndex,
      nextEntries: JournalEntryV2[],
      invocation?: Invocation
    ) => JournalEntryV2
  >
> = {
  Input: input,
  Output: output,
  GetState: getState,
  GetEagerState: getState,
  SetState: setState,
  GetStateKeys: getStateKeys,
  GetEagerStateKeys: getStateKeys,
  ClearState: clearState,
  ClearAllState: clearAllState,
  Sleep: sleep,
  GetPromise: getPromise,
  PeekPromise: peekPromise,
  CompletePromise: completePromise,
  OneWayCall: oneWayCall,
  Call: call,
  Awakeable: awakeable,
  CompleteAwakeable: completeAwakeable,
  Run: run,
  AttachInvocation: attachInvocation,

  'Command: Input': input,
  'Command: Output': output,
  'Command: GetState': getState,
  'Command: GetEagerState': getState,
  'Command: SetState': setState,
  'Command: GetStateKeys': getStateKeys,
  'Command: GetEagerStateKeys': getStateKeys,
  'Command: ClearState': clearState,
  'Command: ClearAllState': clearAllState,
  'Command: Sleep': sleep,
  'Command: GetPromise': getPromise,
  'Command: PeekPromise': peekPromise,
  'Command: CompletePromise': completePromise,
  'Command: OneWayCall': oneWayCall,
  'Command: Call': call,
  'Command: Awakeable': awakeable,
  'Command: CompleteAwakeable': completeAwakeable,
  'Command: Run': run,
  'Command: AttachInvocation': attachInvocation,
  'Command: SendSignal': sendSignal,
  'Notification: Signal': signal,
  'Notification: Call': notificationCall,
  'Notification: CallInvocationId': notificationCallInvocationId,
  'Notification: AttachInvocation': notificationAttachInvocation,
  'Notification: GetPromise': notificationGetPromise,
  'Notification: PeekPromise': notificationPeekPromise,
  'Notification: CompletePromise': notificationCompletePromise,
  'Notification: Run': notificationRun,
  'Notification: Sleep': notificationSleep,
  Event: event,

  'Command: GetInvocationOutput': undefined,
  'Command: Custom': undefined,
  GetInvocationOutput: undefined,
  Custom: undefined,
  CancelInvocation: undefined,
  GetCallInvocationId: undefined,
};
