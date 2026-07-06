import type { JournalEntryMetadata } from '@restate/data-access/admin-api-spec';
import type { QueryContext } from './shared';

export async function getJournalEntryMetadata(
  this: QueryContext,
  invocationId: string,
  entryIndex: number,
): Promise<Response> {
  const journalQuery = await this.query(
    `SELECT index, entry_type, entry_lite_json, appended_at FROM sys_journal WHERE id = '${invocationId}' AND index = ${entryIndex}`,
  );

  const entry = journalQuery.rows?.at(0);

  if (!entry) {
    return new Response(JSON.stringify({ message: 'Not found' }), {
      status: 404,
      statusText: 'Not found',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const metadata: JournalEntryMetadata = {
    index: entry.index,
    entry_type: entry.entry_type,
    entry_lite_json: entry.entry_lite_json,
    appended_at: entry.appended_at,
  };

  return new Response(JSON.stringify(metadata), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
