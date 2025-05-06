import { RestateError } from '@restate/util/errors';
import { decode } from '../decoder';
import { JournalRawEntry } from '@restate/data-access/admin-api/spec';

export function parseResults(result?: any): {
  value?: string;
  failure?: RestateError;
} {
  if (result?.Success) {
    return { value: decodeBinary(result?.Success), failure: undefined };
  }
  if (result?.Failure) {
    return {
      value: undefined,
      failure: new RestateError(
        result?.Failure?.message,
        result?.Failure?.code
      ),
    };
  }

  return {};
}

export function findEntryAfter(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[],
  cb: (jsno?: Record<string, any>) => boolean
) {
  const initialIndex =
    allEntries.at(entry.index) === entry
      ? entry.index
      : allEntries.findIndex(({ index }) => index === entry.index);
  for (let index = initialIndex + 1; index < allEntries.length; index++) {
    const nextEntry = allEntries[index];
    const entryJSON = parseEntryJson(nextEntry?.entry_json);
    const isFound = cb(entryJSON);
    if (isFound) {
      return { entry: nextEntry, entryJSON };
    }
  }
  return {};
}

export function decodeBinary(value?: number[]) {
  if (Array.isArray(value) && value.length > 0) {
    return decode(new Uint8Array(value));
  }
  return undefined;
}

export function parseEntryJson(entryJSON?: string) {
  if (!entryJSON) {
    return {};
  }
  try {
    return JSON.parse(entryJSON);
  } catch (error) {
    return {};
  }
}

export function getTarget(object: any): {
  name?: string;
  key?: string;
  handler?: string;
} {
  if (typeof object === 'object' && object) {
    return Object.values(object)[0] as {
      name?: string;
      key?: string;
      handler?: string;
    };
  }
  return {};
}
