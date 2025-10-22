import { queryFetcher } from './shared';

export async function getStateInterface(
  service: string,
  baseUrl: string,
  headers: Headers,
) {
  const keys: { name: string }[] = await queryFetcher(
    `SELECT DISTINCT key FROM state WHERE service_name = '${service}' GROUP BY key`,
    { baseUrl, headers },
  ).then(({ rows }) => rows.map((row) => ({ name: row.key })));

  return new Response(JSON.stringify({ keys }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
