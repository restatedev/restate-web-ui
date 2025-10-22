import { convertJournalV2 } from '../convertJournalV2';
import type { QueryContext } from './shared';

export async function getJournalEntryV2(
  this: QueryContext,
  invocationId: string,
  entryIndex: number,
) {
  const journalQuery = await this.query(
    `SELECT id, index, appended_at, entry_type, name, entry_json, version, raw, completed, sleep_wakeup_at, invoked_id, invoked_target, promise_name FROM sys_journal WHERE id = '${invocationId}' AND index = '${entryIndex}`,
  );

  const entry = convertJournalV2(journalQuery.rows?.at(0), [], undefined);

  if (!entry) {
    return new Response(JSON.stringify({ message: 'Not found' }), {
      status: 404,
      statusText: 'Not found',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(entry), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
