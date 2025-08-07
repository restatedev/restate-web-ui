import {
  Invocation,
  JournalEntryV2,
} from '@restate/data-access/admin-api/spec';
import { JournalRawEntryWithCommandIndex, parseEntryJson } from './util';

export function event(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
):
  | Extract<JournalEntryV2, { type?: 'TransientError'; category?: 'event' }>
  | JournalEntryV2 {
  const entryJSON = parseEntryJson(entry.entry_json ?? entry.entry_lite_json);
  const isTransientError = entryJSON?.Event?.ty === 'TransientError';

  if (isTransientError) {
    const metadata = entryJSON?.Event;

    return {
      start: entry.appended_at,
      isPending: false,
      commandIndex: undefined,
      type: 'TransientError',
      category: 'event',
      completionId: undefined,
      end: undefined,
      index: entry.index,
      relatedIndexes: undefined,
      isRetrying: false,
      isLoaded: true,
      error: undefined,
      resultType: undefined,
      stackTrace: metadata?.error_stacktrace,
      message: metadata?.error_message,
      code: metadata?.error_code,
      errorCount: metadata?.count,
      relatedCommandName: metadata?.related_command_name,
      relatedCommandType: metadata?.related_command_type,
      relatedRestateErrorCode: metadata?.restate_doc_error_code,
      relatedCommandIndex: metadata?.related_command_index,
    } as Extract<
      JournalEntryV2,
      { type?: 'TransientError'; category?: 'event' }
    >;
  }

  return entry as JournalEntryV2;
}
