import { convertJournal } from '../convertJournal';
import type { QueryContext } from './shared';

export async function getInvocationJournal(
  this: QueryContext,
  invocationId: string,
) {
  const entries = await this.query(
    `SELECT * FROM sys_journal WHERE id = '${invocationId}'`,
  ).then(({ rows }) =>
    rows.map((entry, _, allEntries) => convertJournal(entry, allEntries)),
  );
  return new Response(JSON.stringify({ entries }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
