import { RestateError } from '@restate/util/errors';
import { decode } from '../decoder';
import type {
  Invocation,
  JournalEntryV2,
  JournalRawEntry,
} from '@restate/data-access/admin-api/spec';

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
        result?.Failure?.code,
      ),
    };
  }

  return {};
}

export function parseResults2(result?: any) {
  if (
    typeof result === 'string' &&
    ['Success', 'Void', 'Failure'].includes(result)
  ) {
    return {
      resultType: result.toLowerCase() as 'success' | 'void' | 'failure',
    };
  }

  if (result?.Success && typeof result?.Success === 'object') {
    return {
      value: decodeBinary(result?.Success),
      resultType: 'success',
    } as const;
  }

  if (result?.Failure && typeof result?.Failure === 'object') {
    return {
      resultType: 'failure',
      error: new RestateError(
        result?.Failure?.message,
        result?.Failure?.code,
        false,
      ),
    } as const;
  }

  return {
    resultType: undefined,
    error: undefined,
    value: undefined,
  };
}

export function getLastFailureV1(
  entry: JournalRawEntry,
  invocation?: Invocation,
) {
  const hasLastFailure =
    invocation?.last_failure_related_entry_index === entry.index;
  const lastFailure = hasLastFailure
    ? new RestateError(
        invocation?.last_failure || '',
        invocation?.last_failure_error_code,
      )
    : undefined;

  return lastFailure;
}

export function getCompletionEntry<T extends JournalEntryV2>(
  completionId: number,
  type: string,
  nextEntries: JournalEntryV2[],
) {
  for (let index = nextEntries.length - 1; index >= 0; index--) {
    const completionEntry = nextEntries[index];
    if (
      completionEntry?.category === 'notification' &&
      completionEntry?.type === type &&
      completionEntry?.completionId === completionId
    ) {
      return completionEntry as T;
    }
  }
  return undefined;
}

export function getEntryResultV2(
  entry: JournalRawEntryWithCommandIndex,
  invocation: Invocation | undefined,
  nextEntries: JournalEntryV2[],
  result?: any,
  relatedIndexes: (number | undefined)[] = [],
): {
  resultType?: 'success' | 'void' | 'failure';
  value?: string;
  error?: RestateError;
  isRetrying: boolean;
  relatedIndexes: number[];
} {
  const commandIndex = entry.command_index;
  const hasLastFailure =
    typeof commandIndex === 'number' &&
    invocation?.last_failure_related_command_index === commandIndex;
  const releventEntries = nextEntries.filter(
    (entry) =>
      entry.category === 'event' &&
      commandIndex !== undefined &&
      'relatedCommandIndex' in entry &&
      entry.relatedCommandIndex === commandIndex,
  );

  const transientFailures = releventEntries.filter(
    (entry) => entry.type === 'Event: TransientError',
  ) as Extract<
    JournalEntryV2,
    { type?: 'Event: TransientError'; category?: 'event' }
  >[];

  const hasTransientFailures = transientFailures.length > 0;
  const isThereAnyCommandRunningAfter = nextEntries.some((nextEntry) => {
    return (
      nextEntry.start &&
      entry.appended_at &&
      nextEntry.category === 'command' &&
      entry.appended_at < nextEntry.start
    );
  });

  const { resultType, value, error } = parseResults2(result);
  const isRetrying =
    !isThereAnyCommandRunningAfter && (hasTransientFailures || hasLastFailure);

  const lastFailure = hasLastFailure
    ? new RestateError(
        invocation?.last_failure || '',
        invocation?.last_failure_error_code,
        true,
      )
    : undefined;
  const lastTransientError = isRetrying
    ? new RestateError(
        transientFailures?.at(-1)?.message || '',
        transientFailures?.at(-1)?.relatedRestateErrorCode ||
          transientFailures?.at(-1)?.code?.toString(),
        true,
      )
    : undefined;

  return {
    isRetrying,
    error: error || lastFailure || lastTransientError,
    value,
    resultType,
    relatedIndexes: [
      ...releventEntries.map((entry) => entry.index),
      ...relatedIndexes,
    ].filter(
      (num: number | undefined): num is number => typeof num === 'number',
    ),
  };
}

export function findEntryAfter(
  entry: JournalRawEntry,
  allEntries: JournalRawEntry[],
  cb: (jsno?: Record<string, any>) => boolean,
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

export type JournalRawEntryWithCommandIndex = JournalRawEntry & {
  command_index?: number;
};
