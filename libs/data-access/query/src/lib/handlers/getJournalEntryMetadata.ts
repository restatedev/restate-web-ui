import { convertJournalV2 } from '../convertJournalV2';
import type { QueryContext } from './shared';

export async function getJournalEntryMetadata(
  this: QueryContext,
  invocationId: string,
  entryIndex: number,
  includeRaw = false,
): Promise<Response> {
  const journalQuery = await this.query(
    `SELECT id, index, appended_at, entry_type, name, entry_lite_json, ${includeRaw ? 'raw,' : ''} version, completed, sleep_wakeup_at, invoked_id, invoked_target, promise_name FROM sys_journal WHERE id = '${invocationId}' AND index = ${entryIndex}`,
  );

  const rawEntry = journalQuery.rows?.at(0);

  if (!rawEntry) {
    return new Response(JSON.stringify({ message: 'Not found' }), {
      status: 404,
      statusText: 'Not found',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (
    !includeRaw &&
    (!rawEntry.version || rawEntry.version === 1) &&
    rawEntry.entry_type !== 'Input'
  ) {
    return getJournalEntryMetadata.call(this, invocationId, entryIndex, true);
  }

  const entry = convertJournalV2(rawEntry, [], undefined);

  return new Response(JSON.stringify(entry), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
