import type {
  JournalEntryV2,
  JournalRawEntry,
  operations,
} from '@restate/data-access-admin-api-spec';
import { ERROR_CODES, UI_ERROR_CODES } from '@restate/util-errors';
import {
  convertInvocationV2,
  type TransientError,
} from '../convertInvocation.js';
import { convertJournalV2 } from '../convertJournalV2.js';
import {
  createFutureEntries,
  createFutureEntriesRegistry,
} from '../futureEntries.js';
import {
  type JournalEntryConversionContext,
  type JournalRawEntryWithCommandIndex,
  lifeCycles,
} from '@restate/features-service-protocol';
import {
  type QueryContext,
  SYS_INVOCATION_SELECT_COLUMNS,
  quoteSqlString,
} from './shared.js';
import {
  appendJournalRows,
  deleteCachedJournal,
  getCachedJournal,
  isCacheableJournal,
  isJournalReplaced,
  isSameJournalEvents,
  journalCacheKey,
  type JournalEventRow,
  noteJournalFallback,
  setCachedJournal,
} from './journalCache.js';
import { fetchVqueueStatuses } from './vqueue.js';
import { getVqueueSnapshot } from './getVqueue.js';

type InvocationJournalV2Response =
  operations['get_invocation_journal_v2']['responses']['200']['content']['application/json'];
type InvocationV2 = ReturnType<typeof convertInvocationV2>;

function sortJournalEntries(entries: JournalEntryV2[]) {
  const timestampCache = new Map<JournalEntryV2, number>();
  const getTimestamp = (entry: JournalEntryV2): number => {
    let cached = timestampCache.get(entry);
    if (cached === undefined) {
      cached =
        typeof entry.start === 'string' ? new Date(entry.start).getTime() : 0;
      timestampCache.set(entry, cached);
    }
    return cached;
  };

  entries.sort((a, b) => {
    if (
      typeof a.index === 'number' &&
      typeof b.index === 'number' &&
      ((a.category === 'command' && b.category === 'command') ||
        (a.category === 'event' && b.category === 'event') ||
        ['Created', 'Pending', 'Scheduled'].includes(a.type as string) ||
        ['Created', 'Pending', 'Scheduled'].includes(b.type as string))
    ) {
      return a.index - b.index;
    } else if (typeof a.start === 'string' && typeof b.start === 'string') {
      if (
        a.start === b.start &&
        a.type === 'Running' &&
        b.category === 'command'
      ) {
        return -1;
      }
      if (
        a.start === b.start &&
        b.type === 'Running' &&
        a.category === 'command'
      ) {
        return 1;
      }
      return getTimestamp(a) - getTimestamp(b);
    } else {
      return 0;
    }
  });

  return entries;
}

function createSyntheticIndexAllocator(
  ...entryGroups: { index?: unknown }[][]
) {
  let nextIndex = 0;
  for (const entries of entryGroups) {
    for (const entry of entries) {
      if (typeof entry.index === 'number' && entry.index >= nextIndex) {
        nextIndex = entry.index + 1;
      }
    }
  }

  return () => nextIndex++;
}

// The most recent transient-error event (rows are ordered by appended_at ASC,
// so scan from the end). Parsed defensively so a malformed event can't break
// the journal response.
function getLastTransientError(
  rows: { event_type?: string; event_json?: string }[],
): TransientError | undefined {
  const event = rows.findLast(
    (row) => row?.event_type === 'TransientError' && Boolean(row.event_json),
  );
  if (!event?.event_json) {
    return undefined;
  }
  try {
    return JSON.parse(event.event_json) as TransientError;
  } catch {
    return undefined;
  }
}

function convertJournalEntries(
  journalRows: JournalRawEntry[],
  eventRows: JournalEventRow[],
  invocation: InvocationV2,
) {
  const futureEntriesRegistry = createFutureEntriesRegistry(invocation);
  const conversionContext: JournalEntryConversionContext = {
    future: futureEntriesRegistry,
    completionEntryById: new Map<number, JournalEntryV2>(),
    signalEntryByIndex: new Map<number, JournalEntryV2>(),
    signalEntriesByName: new Map<string, JournalEntryV2[]>(),
  };

  let commandCount = 0;
  const eventsEntries = eventRows.map(
    (entry, i) =>
      ({
        ...entry,
        entry_type: `Event: ${entry.event_type}`,
        index: journalRows.length + i,
      }) as JournalRawEntry,
  );
  const allocateSyntheticIndex = createSyntheticIndexAllocator(
    journalRows,
    eventsEntries,
  );
  const lifeCycleEntries = lifeCycles(
    eventsEntries,
    allocateSyntheticIndex,
    invocation,
  );

  const journalAndEventEntries = [...journalRows, ...eventsEntries];

  const entriesWithCommandIndex: (
    | JournalRawEntryWithCommandIndex
    | JournalEntryV2
  )[] = [];
  for (const rawEntry of journalAndEventEntries) {
    if (rawEntry.entry_type?.startsWith('Command:')) {
      entriesWithCommandIndex.push({
        ...rawEntry,
        command_index: commandCount,
      });
      commandCount++;
    } else {
      entriesWithCommandIndex.push(rawEntry);
    }
  }

  const entries: JournalEntryV2[] = [];
  for (let i = entriesWithCommandIndex.length - 1; i >= 0; i--) {
    const entry = entriesWithCommandIndex[i];
    if (entry && 'entry_type' in entry) {
      const convertedEntry = convertJournalV2(
        entry,
        entries,
        invocation,
        conversionContext,
      );
      if (convertedEntry) {
        entries.push(convertedEntry);
      }
    } else if (entry) {
      entries.push(entry);
    }
  }
  entries.reverse();

  const futureEntries = createFutureEntries(
    futureEntriesRegistry,
    conversionContext,
    allocateSyntheticIndex,
  );
  return sortJournalEntries([
    ...entries,
    ...futureEntries,
    ...lifeCycleEntries,
  ]);
}

function journalEntriesSql(
  invocationIdSql: string,
  includeRaw: boolean,
  fromIndex?: number,
) {
  return `SELECT id, index, appended_at, entry_type, name, raw_length, entry_lite_json, ${includeRaw ? 'raw,' : ''} version, completed, sleep_wakeup_at, invoked_id, invoked_target, promise_name FROM sys_journal WHERE id = ${invocationIdSql}${typeof fromIndex === 'number' ? ` AND index >= ${fromIndex}` : ''} ORDER BY index`;
}

function journalResponseBody(
  invocation: Omit<InvocationJournalV2Response, 'journal'>,
  entriesJson: string,
  version: number | undefined,
) {
  const invocationJson = JSON.stringify(invocation);
  const journalJson = `{"entries":${entriesJson}${
    version === undefined ? '' : `,"version":${JSON.stringify(version)}`
  }}`;
  return invocationJson === '{}'
    ? `{"journal":${journalJson}}`
    : `${invocationJson.slice(0, -1)},"journal":${journalJson}}`;
}

export async function getInvocationJournalV2(
  this: QueryContext,
  invocationId: string,
  includeRaw = false,
): Promise<Response> {
  const requestTime = new Date().toISOString();
  const invocationIdSql = quoteSqlString(invocationId);
  const cacheKey = journalCacheKey(this.baseUrl, invocationId);
  const cached = includeRaw ? undefined : getCachedJournal(cacheKey);
  const [invocationQuery, journalQuery, eventsQuery, vqueueStatuses] =
    await Promise.all([
      this.query(
        `SELECT ${SYS_INVOCATION_SELECT_COLUMNS.join(', ')} FROM sys_invocation WHERE id = ${invocationIdSql}`,
        'invocations/get',
      ),
      this.query(
        journalEntriesSql(
          invocationIdSql,
          includeRaw,
          cached?.rows.at(-1)?.index,
        ),
        'invocations/journal-entries',
      ),
      this.query(
        `SELECT after_journal_entry_index, appended_at, event_type, event_json from sys_journal_events WHERE id = ${invocationIdSql} ORDER BY appended_at`,
        'invocations/journal-events',
      ),
      fetchVqueueStatuses(this, [invocationId]),
    ]);

  const rawInvocation = invocationQuery.rows.at(0);
  let journalRows = journalQuery.rows as JournalRawEntry[];
  let eventRows = eventsQuery.rows as JournalEventRow[];
  if (cached && rawInvocation) {
    if (isSameJournalEvents(cached.events, eventRows)) {
      eventRows = cached.events;
    }
    const mergedRows = isJournalReplaced(cached, rawInvocation)
      ? undefined
      : appendJournalRows(cached.rows, journalRows);
    if (mergedRows) {
      journalRows = mergedRows;
    } else {
      deleteCachedJournal(cacheKey);
      noteJournalFallback(cacheKey);
      const fullJournalQuery = await this.query(
        journalEntriesSql(invocationIdSql, includeRaw),
        'invocations/journal-entries',
      );
      journalRows = fullJournalQuery.rows as JournalRawEntry[];
    }
  }

  const shouldFetchWithRaw =
    !includeRaw &&
    journalRows.some(
      (entry) =>
        (!entry.version || entry.version === 1) && entry.entry_type !== 'Input',
    );

  if (shouldFetchWithRaw) {
    return getInvocationJournalV2.call(this, invocationId, true);
  }

  const vqueueStatus = vqueueStatuses.get(invocationId);
  const invocation = rawInvocation
    ? convertInvocationV2(
        rawInvocation,
        vqueueStatus,
        requestTime,
        getLastTransientError(eventRows),
      )
    : undefined;
  if (!invocation) {
    deleteCachedJournal(cacheKey);
    return new Response(
      JSON.stringify({
        message: ERROR_CODES[UI_ERROR_CODES.invocationNotFound]?.help,
        restate_code: UI_ERROR_CODES.invocationNotFound,
      }),
      {
        status: 404,
        statusText: 'Not found',
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const vqueueId = invocation.vqueue?.vqueue_id ?? invocation.vqueue_id;
  const vqueueSnapshot = vqueueId
    ? await getVqueueSnapshot.call(this, vqueueId, invocation.id, {
        focusedInvocation: invocation,
        requestTime,
      })
    : undefined;

  const entriesKey = JSON.stringify([rawInvocation, vqueueStatus ?? null]);
  const entriesJson =
    cached &&
    cached.rows === journalRows &&
    cached.events === eventRows &&
    cached.entriesKey === entriesKey
      ? cached.entriesJson
      : JSON.stringify(
          convertJournalEntries(journalRows, eventRows, invocation),
        );

  if (
    !includeRaw &&
    !rawInvocation?.completed_at &&
    isCacheableJournal(journalRows)
  ) {
    setCachedJournal(cacheKey, {
      createdAt: rawInvocation?.created_at,
      rows: journalRows,
      events: eventRows,
      entriesKey,
      entriesJson,
    });
  } else {
    deleteCachedJournal(cacheKey);
  }

  return new Response(
    journalResponseBody(
      {
        ...invocation,
        ...(vqueueSnapshot && { vqueueSnapshot }),
      } satisfies Omit<InvocationJournalV2Response, 'journal'>,
      entriesJson,
      journalRows.at(0)?.version,
    ),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
