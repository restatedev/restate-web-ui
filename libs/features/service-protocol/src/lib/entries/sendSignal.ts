import {
  Invocation,
  JournalEntryV2,
} from '@restate/data-access/admin-api/spec';
import {
  getEntryResultV2,
  JournalRawEntryWithCommandIndex,
  parseEntryJson,
} from './util';

export function sendSignal(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation
): Extract<JournalEntryV2, { type?: 'Cancel'; category?: 'command' }> {
  const entryJSON = parseEntryJson(entry.entry_json ?? entry.entry_lite_json);

  const id: number | undefined =
    entryJSON?.Command?.SendSignal?.signal_id?.Index;
  const invocationId = entryJSON?.Command?.SendSignal?.target_invocation_id;

  if (id === 1) {
    const { error, relatedIndexes } = getEntryResultV2(
      entry,
      invocation,
      nextEntries,
      undefined
    );

    return {
      start: entry.appended_at,
      isPending: false,
      commandIndex: entry.command_index,
      type: 'Cancel',
      category: 'command',
      completionId: undefined,
      end: undefined,
      index: entry.index,
      relatedIndexes,
      isRetrying: false,
      isLoaded: true,
      error,
      value: undefined,
      resultType: undefined,
      invocationId,
    } as Extract<JournalEntryV2, { type?: 'Cancel'; category?: 'command' }>;
  }

  return {};
}
