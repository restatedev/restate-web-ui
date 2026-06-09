import type {
  JournalEntryV2,
  JournalRawEntry,
} from '@restate/data-access/admin-api-spec';
import { ERROR_CODES, UI_ERROR_CODES } from '@restate/util/errors';
import { convertInvocation, type TransientError } from '../convertInvocation';
import { convertJournalV2 } from '../convertJournalV2';
import {
  createFutureEntries,
  createFutureEntriesRegistry,
} from '../futureEntries';
import {
  type JournalEntryConversionContext,
  type JournalRawEntryWithCommandIndex,
  lifeCycles,
} from '@restate/features/service-protocol';
import {
  type QueryContext,
  getSysInvocationColumns,
  supportsJournalRawLength,
} from './shared';
import { fetchVqueueStatus } from './vqueue';

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

export async function getInvocationJournalV2(
  this: QueryContext,
  invocationId: string,
  includePayloads = false,
  vqueueId?: string,
  includeRaw = false,
): Promise<Response> {
  const entryJsonColumn = includePayloads ? 'entry_json' : 'entry_lite_json';
  const rawLengthColumn = supportsJournalRawLength(this.restateVersion)
    ? 'raw_length,'
    : '';
  const [invocationQuery, journalQuery, eventsQuery, vqueueHint] =
    await Promise.all([
      this.query(
        `SELECT ${getSysInvocationColumns(this.features).join(', ')} FROM sys_invocation WHERE id = '${invocationId}'`,
      ),
      this.query(
        `SELECT id, index, appended_at, entry_type, name, ${rawLengthColumn} ${entryJsonColumn}, ${includeRaw ? 'raw,' : ''} version, completed, sleep_wakeup_at, invoked_id, invoked_target, promise_name FROM sys_journal WHERE id = '${invocationId}' ORDER BY index`,
      ),
      this.query(
        `SELECT after_journal_entry_index, appended_at, event_type, event_json from sys_journal_events WHERE id = '${invocationId}' ORDER BY appended_at`,
      ),
      // Resolve the vqueue status in parallel using the id the UI carried over
      // from its last poll. If it's missing or stale, the whole batch is
      // re-fired with the correct id below so all four queries stay in sync.
      fetchVqueueStatus(this, invocationId, vqueueId),
    ]);
  const shouldFetchWithRaw =
    !includeRaw &&
    journalQuery.rows.some(
      (entry) =>
        (!entry.version || entry.version === 1) && entry.entry_type !== 'Input',
    );

  if (shouldFetchWithRaw) {
    return getInvocationJournalV2.call(
      this,
      invocationId,
      includePayloads,
      vqueueId,
      true,
    );
  }

  const rawInvocation = invocationQuery.rows.at(0);
  if (!rawInvocation) {
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

  // The hint was missing or stale (came back empty) but the invocation is
  // actually in a vqueue: re-run the whole batch with the correct id so the
  // journal, events and vqueue state are all sampled at the same time. The
  // `!== vqueueId` guard bounds this to a single retry — the recall passes the
  // discovered id, so the next pass can't re-trigger (no infinite loop, even
  // when that id also resolves to no row).
  if (
    !vqueueHint &&
    rawInvocation.vqueue_id &&
    rawInvocation.vqueue_id !== vqueueId
  ) {
    return getInvocationJournalV2.call(
      this,
      invocationId,
      includePayloads,
      rawInvocation.vqueue_id,
      includeRaw,
    );
  }
  const invocation = convertInvocation(
    rawInvocation,
    vqueueHint,
    getLastTransientError(eventsQuery.rows),
  );

  const version = journalQuery.rows.at(0)?.version;
  const journalRows = journalQuery.rows as JournalRawEntry[];
  const futureEntriesRegistry = createFutureEntriesRegistry(invocation);
  const conversionContext: JournalEntryConversionContext = {
    future: futureEntriesRegistry,
    completionEntryById: new Map<number, JournalEntryV2>(),
    signalEntryByIndex: new Map<number, JournalEntryV2>(),
    signalEntriesByName: new Map<string, JournalEntryV2[]>(),
  };

  let commandCount = 0;
  const eventsEntries = eventsQuery.rows.map(
    (entry, i) =>
      ({
        ...entry,
        entry_type: `Event: ${entry.event_type}`,
        index: journalQuery.rows.length + i,
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
    if ('entry_type' in rawEntry) {
      if (rawEntry.entry_type?.startsWith('Command:')) {
        (rawEntry as JournalRawEntryWithCommandIndex).command_index =
          commandCount;
        commandCount++;
      }
    }
    entriesWithCommandIndex.push(rawEntry);
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
  const entriesWithLifeCycleEvents = sortJournalEntries([
    ...entries,
    ...futureEntries,
    ...lifeCycleEntries,
  ]);

  return new Response(
    JSON.stringify({
      ...invocation,
      journal: {
        entries: entriesWithLifeCycleEvents,
        version,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
