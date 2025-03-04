import { fromBinary } from '@bufbuild/protobuf';
import { SleepEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';
import { toUnit8Array } from '../toUni8Array';
import { RestateError } from '@restate/util/errors';
import { JournalRawEntry } from '@restate/data-access/admin-api/spec';
import { parseEntryJson, convertToUTC, findEntryAfter } from './util';

function sleepV1(entry: JournalRawEntry) {
  const { raw } = entry;
  if (!raw) {
    return {};
  }
  const message = fromBinary(SleepEntryMessageSchema, toUnit8Array(raw));
  switch (message.result.case) {
    case 'empty':
      return {
        name: message.name,
        failure: undefined,
        sleep_wakeup_at: convertToUTC(entry.sleep_wakeup_at)!,
      };
    case 'failure':
      return {
        name: message.name,
        failure: new RestateError(
          message.result.value.message,
          message.result.value.code.toString()
        ),
        sleep_wakeup_at: convertToUTC(entry.sleep_wakeup_at)!,
      };

    default:
      return {
        name: message.name,
        failure: undefined,
        sleep_wakeup_at: convertToUTC(entry.sleep_wakeup_at)!,
      };
  }
}

function sleepV2(entry: JournalRawEntry, allEntries: JournalRawEntry[]) {
  const entryJSON = parseEntryJson(entry.entry_json);
  const completedId = entryJSON?.Command?.Sleep?.completion_id;

  const { entryJSON: resultCompletionEntryJson, entry: completionEntry } =
    findEntryAfter(entry, allEntries, (entryJSON) => {
      const isCompletionEntry =
        entryJSON?.['Notification']?.Completion?.Sleep?.completion_id ===
        completedId;

      return isCompletionEntry;
    });
  const sleep_wakeup_at = entryJSON?.Command?.Sleep?.wake_up_time;
  return {
    name: entryJSON?.Command?.Sleep?.name,
    start: entry?.appended_at,
    end: completionEntry?.appended_at,
    completed: entry?.completed ?? Boolean(completionEntry),
    ...(typeof sleep_wakeup_at === 'number' && {
      sleep_wakeup_at: new Date(sleep_wakeup_at).toISOString(),
    }),

    // TODO display failure
    failure: undefined,
  };
}

export function sleep(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[]
): {
  name?: string;
  start?: string;
  end?: string;
  sleep_wakeup_at?: string;
  completed?: boolean;
  failure?: RestateError;
} {
  if (entry.version === 1 || !entry.version) {
    return sleepV1(entry);
  }

  if (entry.version === 2 && entry.entry_json) {
    return sleepV2(entry, allEntries);
  }

  return {};
}
