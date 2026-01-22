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

const completionCache = new WeakMap<
  JournalEntryV2[],
  { map: Map<string, JournalEntryV2>; builtLength: number }
>();

function buildCompletionCacheKey(
  type: string,
  completionId: number | undefined,
): string {
  return `${type}:${completionId}`;
}

export function getCompletionEntry<T extends JournalEntryV2>(
  completionId: number,
  type: string,
  nextEntries: JournalEntryV2[],
) {
  let cacheData = completionCache.get(nextEntries);

  if (!cacheData || cacheData.builtLength !== nextEntries.length) {
    const map = cacheData?.map ?? new Map<string, JournalEntryV2>();
    const startIndex = cacheData?.builtLength ?? 0;

    for (let index = startIndex; index < nextEntries.length; index++) {
      const entry = nextEntries[index];
      if (
        entry?.category === 'notification' &&
        entry?.completionId !== undefined
      ) {
        const entryCacheKey = buildCompletionCacheKey(
          entry.type as string,
          entry.completionId,
        );
        if (!map.has(entryCacheKey)) {
          map.set(entryCacheKey, entry);
        }
      }
    }

    cacheData = { map, builtLength: nextEntries.length };
    completionCache.set(nextEntries, cacheData);
  }

  const cacheKey = buildCompletionCacheKey(type, completionId);
  return cacheData.map.get(cacheKey) as T | undefined;
}

const eventsByCommandIndexCache = new WeakMap<
  JournalEntryV2[],
  {
    map: Map<number, JournalEntryV2[]>;
    seenEntries: Set<JournalEntryV2>;
    builtLength: number;
  }
>();
const latestCommandStartCache = new WeakMap<
  JournalEntryV2[],
  { value: string | undefined; length: number }
>();

function getEventsByCommandIndex(
  nextEntries: JournalEntryV2[],
): Map<number, JournalEntryV2[]> {
  let cacheData = eventsByCommandIndexCache.get(nextEntries);

  if (!cacheData || cacheData.builtLength !== nextEntries.length) {
    const map = cacheData?.map ?? new Map<number, JournalEntryV2[]>();
    const seenEntries = cacheData?.seenEntries ?? new Set<JournalEntryV2>();
    const startIndex = cacheData?.builtLength ?? 0;

    for (let i = startIndex; i < nextEntries.length; i++) {
      const entry = nextEntries[i];
      if (
        entry &&
        entry.category === 'event' &&
        'relatedCommandIndex' in entry &&
        typeof entry.relatedCommandIndex === 'number' &&
        !seenEntries.has(entry)
      ) {
        seenEntries.add(entry);
        const existing = map.get(entry.relatedCommandIndex);
        if (existing) {
          existing.push(entry);
        } else {
          map.set(entry.relatedCommandIndex, [entry]);
        }
      }
    }

    cacheData = { map, seenEntries, builtLength: nextEntries.length };
    eventsByCommandIndexCache.set(nextEntries, cacheData);
  }

  return cacheData.map;
}

function getLatestCommandStart(
  nextEntries: JournalEntryV2[],
): string | undefined {
  const cached = latestCommandStartCache.get(nextEntries);
  if (cached && cached.length === nextEntries.length) {
    return cached.value;
  }

  let latestStart: string | undefined = cached?.value;
  const startIndex = cached?.length ?? 0;

  for (let i = startIndex; i < nextEntries.length; i++) {
    const entry = nextEntries[i];
    if (entry && entry.category === 'command' && entry.start) {
      if (!latestStart || entry.start > latestStart) {
        latestStart = entry.start;
      }
    }
  }

  latestCommandStartCache.set(nextEntries, {
    value: latestStart,
    length: nextEntries.length,
  });
  return latestStart;
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

  const eventsByCommandIndex = getEventsByCommandIndex(nextEntries);
  const relevantEntries =
    commandIndex !== undefined
      ? (eventsByCommandIndex.get(commandIndex) ?? [])
      : [];

  const transientFailures: Extract<
    JournalEntryV2,
    { type?: 'Event: TransientError'; category?: 'event' }
  >[] = [];
  for (const relevantEntry of relevantEntries) {
    if (relevantEntry.type === 'Event: TransientError') {
      transientFailures.push(
        relevantEntry as Extract<
          JournalEntryV2,
          { type?: 'Event: TransientError'; category?: 'event' }
        >,
      );
    }
  }

  const hasTransientFailures = transientFailures.length > 0;

  const latestCommandStart = getLatestCommandStart(nextEntries);
  const isThereAnyCommandRunningAfter =
    latestCommandStart !== undefined &&
    entry.appended_at !== undefined &&
    entry.appended_at < latestCommandStart;

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

  const allRelatedIndexes: number[] = [];
  for (const relevantEntry of relevantEntries) {
    if (typeof relevantEntry.index === 'number') {
      allRelatedIndexes.push(relevantEntry.index);
    }
  }
  for (const idx of relatedIndexes) {
    if (typeof idx === 'number') {
      allRelatedIndexes.push(idx);
    }
  }

  return {
    isRetrying,
    error: error || lastFailure || lastTransientError,
    value,
    resultType,
    relatedIndexes: allRelatedIndexes,
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
