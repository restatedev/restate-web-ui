import { JournalRawEntry } from '@restate/data-access/admin-api/spec';
import { parseEntryJson, findEntryAfter, parseResults } from './util';

function attachInvocationV2(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
) {
  const entryJSON = parseEntryJson(entry.entry_json);
  const completedId = entryJSON?.Command?.AttachInvocation?.completion_id;
  const invocationId =
    entryJSON?.Command?.AttachInvocation?.target?.InvocationId;
  // TODO: display canceled runs
  // TODO: display Failure results
  /**
   * If there is no completionEntry, either it's still in progress
   * or it has been failed. The error can be find in the invocation.
   */
  const { entryJSON: completionEntryJson, entry: completionEntry } =
    findEntryAfter(entry, allEntries, (entryJSON) => {
      const isCompletionEntry =
        entryJSON?.['Notification']?.Completion?.AttachInvocation
          ?.completion_id === completedId;

      return isCompletionEntry;
    });
  const completionEntryResult =
    completionEntryJson?.Notification?.Completion?.AttachInvocation?.result;

  return {
    name: entryJSON?.Command?.AttachInvocation?.name,
    completed: Boolean(completionEntry),
    ...parseResults(completionEntryResult),
    start: entry?.appended_at,
    end: completionEntry?.appended_at,
    invocationId,
  };
}

export function attachInvocation(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
) {
  if (entry.version === 2 && entry.entry_json) {
    return attachInvocationV2(entry, allEntries);
  }

  return {};
}
