import {
  Invocation,
  JournalEntryV2,
} from '@restate/data-access/admin-api/spec';
import { JournalRawEntryWithCommandIndex, parseEntryJson } from './util';
import { RestateError } from '@restate/util/errors';

export function event(
  entry: JournalRawEntryWithCommandIndex,
  nextEntries: JournalEntryV2[],
  invocation?: Invocation,
):
  | Extract<
      JournalEntryV2,
      | { type?: 'Event: TransientError'; category?: 'event' }
      | { type?: 'Event: Paused'; category?: 'event' }
    >
  | JournalEntryV2
  | undefined {
  const metadata = parseEntryJson(entry.event_json);
  switch (entry.entry_type) {
    case 'Event: TransientError': {
      return {
        start: entry.appended_at,
        isPending: false,
        commandIndex: undefined,
        type: 'Event: TransientError',
        category: 'event',
        completionId: undefined,
        end: undefined,
        index: entry.index,
        relatedIndexes: undefined,
        isRetrying: false,
        isLoaded: true,
        error: new RestateError(
          metadata?.error_message,
          metadata?.restate_doc_error_code || metadata?.error_code,
          true,
        ),
        resultType: undefined,
        afterJournalEntryIndex: entry.after_journal_entry_index,
        message: metadata?.error_message,
        code: metadata?.error_code,
        relatedCommandName: metadata?.related_command_name,
        relatedCommandType: metadata?.related_command_type,
        relatedRestateErrorCode: metadata?.restate_doc_error_code,
        relatedCommandIndex: metadata?.related_command_index,
      } as Extract<
        JournalEntryV2,
        { type?: 'Event: TransientError'; category?: 'event' }
      >;
    }
    case 'Event: Paused': {
      return {
        start: entry.appended_at,
        isPending: true,
        commandIndex: undefined,
        type: 'Event: Paused',
        category: 'event',
        completionId: undefined,
        end: undefined,
        index: entry.index,
        relatedIndexes: undefined,
        isRetrying: false,
        isLoaded: true,
        error: metadata?.last_failure
          ? new RestateError(
              metadata?.last_failure?.error_message,
              metadata?.last_failure?.restate_doc_error_code ||
                metadata?.last_failure?.error_code,
              true,
            )
          : undefined,
        resultType: undefined,
        message: metadata?.last_failure?.error_message,
        code: metadata?.last_failure?.error_code,
        relatedCommandName: metadata?.last_failure?.related_command_name,
        relatedCommandType: metadata?.last_failure?.related_command_type,
        relatedRestateErrorCode: metadata?.last_failure?.restate_doc_error_code,
        relatedCommandIndex: metadata?.last_failure?.related_command_index,
      } as Extract<
        JournalEntryV2,
        { type?: 'Event: Paused'; category?: 'event' }
      >;
    }

    default:
      break;
  }

  return entry as JournalEntryV2;
}
