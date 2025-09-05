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
  | JournalEntryV2
  | undefined {
  const metadata = parseEntryJson(entry.event_json);
  switch (metadata?.ty) {
    case 'TransientError': {
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
    case 'Paused': {
      if (invocation?.status !== 'paused') {
        return undefined;
      }
      return {
        start: entry.appended_at,
        isPending: true,
        commandIndex: undefined,
        type: 'Paused',
        category: 'event',
        completionId: undefined,
        end: undefined,
        index: entry.index,
        relatedIndexes: undefined,
        isRetrying: false,
        isLoaded: true,
        error: undefined,
        resultType: undefined,
        stackTrace: metadata?.last_failure?.error_stacktrace,
        message: metadata?.last_failure?.error_message,
        code: metadata?.last_failure?.error_code,
        relatedCommandName: metadata?.last_failure?.related_command_name,
        relatedCommandType: metadata?.last_failure?.related_command_type,
        relatedRestateErrorCode: metadata?.last_failure?.restate_doc_error_code,
        relatedCommandIndex: metadata?.last_failure?.related_command_index,
      } as Extract<JournalEntryV2, { type?: 'Paused'; category?: 'event' }>;
    }

    default:
      break;
  }

  return entry as JournalEntryV2;
}
