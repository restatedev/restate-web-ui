import type { QueryContext } from './shared';

export async function getStateInterface(
  this: QueryContext,
  service: string,
  serviceKey: string[] = [],
  scope?: string,
) {
  const scopeClause = scope !== undefined ? ` AND scope = '${scope}'` : '';
  const keys: { name: string }[] = await this.query(
    `SELECT DISTINCT key FROM state WHERE service_name = '${service}' ${serviceKey.length > 0 ? ` AND service_key IN (${serviceKey.map((key) => `'${key}'`).join(', ')})` : ''}${scopeClause} GROUP BY key`,
  ).then(({ rows }) => rows.map((row) => ({ name: row.key })));

  return new Response(JSON.stringify({ keys }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
