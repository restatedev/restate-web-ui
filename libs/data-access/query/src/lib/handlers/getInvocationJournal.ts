import { convertJournal } from '../convertJournal';
import { queryFetcher } from './shared';

export async function getInvocationJournal(
  invocationId: string,
  baseUrl: string,
  headers: Headers,
) {
  const entries = await queryFetcher(
    `SELECT * FROM sys_journal WHERE id = '${invocationId}'`,
    {
      baseUrl,
      headers,
    },
  ).then(({ rows }) =>
    rows.map((entry, _, allEntries) => convertJournal(entry, allEntries)),
  );
  return new Response(JSON.stringify({ entries }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
