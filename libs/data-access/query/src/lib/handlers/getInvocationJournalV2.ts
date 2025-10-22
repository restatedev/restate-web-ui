import type {
  Invocation,
  JournalEntryV2,
  JournalRawEntry,
} from '@restate/data-access/admin-api/spec';
import { RestateError } from '@restate/util/errors';
import { convertInvocation } from '../convertInvocation';
import { convertJournalV2 } from '../convertJournalV2';
import {
  JournalRawEntryWithCommandIndex,
  lifeCycles,
} from '@restate/features/service-protocol';
import { getVersion } from '../getVersion';
import semverGt from 'semver/functions/gte';
import { queryFetcher } from './shared';

export async function getInvocationJournalV2(
  invocationId: string,
  baseUrl: string,
  headers: Headers,
) {
  const restateVersion = getVersion(headers);
  const [invocationQuery, journalQuery, eventsQuery] = await Promise.all([
    queryFetcher(`SELECT * FROM sys_invocation WHERE id = '${invocationId}'`, {
      baseUrl,
      headers,
    }),
    queryFetcher(
      `SELECT id, index, appended_at, entry_type, name, entry_json, raw, version, completed, sleep_wakeup_at, invoked_id, invoked_target, promise_name FROM sys_journal WHERE id = '${invocationId}'`,
      {
        baseUrl,
        headers,
      },
    ),
    semverGt(restateVersion, '1.4.5')
      ? queryFetcher(
          `SELECT after_journal_entry_index, appended_at, event_type, event_json from sys_journal_events WHERE id = '${invocationId}' AND event_type = 'Paused' ORDER BY appended_at DESC LIMIT 1`,
          {
            baseUrl,
            headers,
          },
        )
      : { rows: [] },
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
  const entriesWithCommandIndex = [
    ...(journalQuery.rows as JournalRawEntry[]),
    ...eventsQuery.rows.map(
      (entry) =>
        ({
          ...entry,
          entry_type: entry.event_type,
          index: journalQuery.rows.length + 1,
        }) as JournalRawEntry,
    ),
  ].reduce((results, rawEntry) => {
    if (rawEntry.entry_type?.startsWith('Command:')) {
      results.push({ ...rawEntry, command_index: commandCount });
      commandCount++;
    } else {
      results.push(rawEntry);
    }

    return results;
  }, [] as JournalRawEntryWithCommandIndex[]);

  const entries = entriesWithCommandIndex
    .reduceRight((results, entry) => {
      const convertedEntry = convertJournalV2(entry, results, invocation);
      if (convertedEntry) {
        return [...results, convertedEntry];
      } else {
        return results;
      }
    }, [] as JournalEntryV2[])
    .reverse();

  const entriesWithLifeCycleEvents = [
    ...lifeCycles(entries, invocation),
    ...entries,
  ].sort((a, b) => {
    if (typeof a.index === 'number' && typeof b.index === 'number') {
      return a.index - b.index;
    } else if (typeof a.start === 'string' && typeof b.start === 'string') {
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    } else {
      return 0;
    }
  });

  if (
    invocation.last_failure &&
    ((invocation.last_failure_related_entry_index !== undefined &&
      invocation.last_failure_related_entry_index >=
        journalQuery.rows.length) ||
      invocation.last_failure_related_command_index === undefined)
  ) {
    entriesWithLifeCycleEvents.push({
      category: invocation.last_failure_related_entry_name
        ? 'command'
        : 'event',
      type: invocation.last_failure_related_entry_type ?? 'TransientError',
      index: invocation.last_failure_related_entry_index,
      ...(invocation.last_failure_related_entry_type && {
        commandIndex: journalQuery.rows.length,
      }),
      error: new RestateError(
        invocation.last_failure,
        invocation.last_failure_error_code,
      ),
    });
  }

  return new Response(
    JSON.stringify({
      ...invocation,
      journal: { entries: entriesWithLifeCycleEvents, version },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
