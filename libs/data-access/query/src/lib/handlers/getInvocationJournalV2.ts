import type {
  Invocation,
  JournalEntryV2,
  JournalRawEntry,
} from '@restate/data-access/admin-api/spec';
import { convertInvocation } from '../convertInvocation';
import { convertJournalV2 } from '../convertJournalV2';
import {
  JournalRawEntryWithCommandIndex,
  lifeCycles,
} from '@restate/features/service-protocol';
import type { QueryContext } from './shared';

export async function getInvocationJournalV2(
  this: QueryContext,
  invocationId: string,
  includePayloads = false,
) {
  const entryJsonColumn = includePayloads ? 'entry_json' : 'entry_lite_json';
  const [invocationQuery, journalQuery, eventsQuery] = await Promise.all([
    this.query(`SELECT * FROM sys_invocation WHERE id = '${invocationId}'`),
    this.query(
      `SELECT id, index, appended_at, entry_type, name, ${entryJsonColumn}, raw, version, completed, sleep_wakeup_at, invoked_id, invoked_target, promise_name FROM sys_journal WHERE id = '${invocationId}'`,
    ),
    this.query(
      `SELECT after_journal_entry_index, appended_at, event_type, event_json from sys_journal_events WHERE id = '${invocationId}'`,
    ),
  ]);

  const invocation = invocationQuery.rows
    .map(convertInvocation)
    .at(0) as Invocation;

  if (!invocation) {
    return new Response(
      JSON.stringify({
        message:
          'Invocation not found or no longer available.\n\nThe requested invocation either does not exist or has already completed and has been removed after its retention period expired. Completed invocations are only retained if a journal retention period is explicitly set, if they are part of a workflow, or if they were invoked with an idempotency key. In all cases, they are retained only for the duration of the specified retention period.',
      }),
      {
        status: 404,
        statusText: 'Not found',
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const version = journalQuery.rows.at(0)?.version;

  let commandCount = 0;
  const eventsEntries = eventsQuery.rows.map(
    (entry, i) =>
      ({
        ...entry,
        entry_type: `Event: ${entry.event_type}`,
        index: journalQuery.rows.length + i,
      }) as JournalRawEntry,
  );

  const allRawEntries = [
    ...(journalQuery.rows as JournalRawEntry[]),
    ...lifeCycles(
      eventsEntries,
      journalQuery.rows.length + eventsEntries.length,
      invocation,
    ),
    ...eventsEntries,
  ];

  const entriesWithCommandIndex: (
    | JournalRawEntryWithCommandIndex
    | JournalEntryV2
  )[] = [];
  for (const rawEntry of allRawEntries) {
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
      const convertedEntry = convertJournalV2(entry, entries, invocation);
      if (convertedEntry) {
        entries.push(convertedEntry);
      }
    } else if (entry) {
      entries.push(entry);
    }
  }
  entries.reverse();

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
      return getTimestamp(a) - getTimestamp(b);
    } else {
      return 0;
    }
  });

  return new Response(
    JSON.stringify({
      ...invocation,
      journal: { entries, version },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
