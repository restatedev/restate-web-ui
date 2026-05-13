import { hexToBase64 } from '@restate/util/binary';
import type { QueryContext } from './shared';

export interface ListStateItem {
  key: string;
  scope?: string;
}

export type ListStateArgs = { keys: string[] } | { items: ListStateItem[] };

export async function listState(
  this: QueryContext,
  service: string,
  args: ListStateArgs,
) {
  if ('keys' in args) {
    return listStateByKeys.call(this, service, args.keys);
  }
  return listStateByItems.call(this, service, args.items);
}

async function listStateByKeys(
  this: QueryContext,
  service: string,
  keys: string[],
) {
  if (keys.length === 0) {
    return emptyResponse();
  }

  const query = `SELECT service_key, key, value
    FROM state WHERE service_name = '${service}' AND service_key IN (${keys
      .map((key) => `'${key}'`)
      .join(', ')})`;

  const objects = await this.query(query).then(({ rows }) => {
    const groups = new Map<
      string,
      { key: string; state: Record<string, string> }
    >();
    for (const key of keys) {
      if (!groups.has(key)) groups.set(key, { key, state: {} });
    }
    for (const row of rows) {
      const group = groups.get(row.service_key);
      if (!group) continue;
      group.state[row.key] = (hexToBase64(row.value) ?? '') as string;
    }
    return Array.from(groups.values()).map(({ key, state }) => ({
      key,
      state: Object.entries(state).map(([name, value]) => ({ name, value })),
    }));
  });

  return new Response(JSON.stringify({ objects }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function listStateByItems(
  this: QueryContext,
  service: string,
  items: ListStateItem[],
) {
  if (items.length === 0) {
    return emptyResponse();
  }

  const valuesRows = items
    .map(({ key, scope }) =>
      scope !== undefined ? `('${key}', '${scope}')` : `('${key}', NULL)`,
    )
    .join(', ');

  const query = `WITH pairs(service_key, scope) AS (VALUES ${valuesRows})
    SELECT s.service_key, s.scope, s.key, s.value
    FROM state s
    JOIN pairs p
      ON s.service_key = p.service_key
     AND (s.scope = p.scope OR (s.scope IS NULL AND p.scope IS NULL))
    WHERE s.service_name = '${service}'`;

  const idOf = (key: string, scope: string | null | undefined) =>
    `${key}\x00${scope ?? ''}`;

  const objects = await this.query(query).then(({ rows }) => {
    const groups = new Map<
      string,
      { key: string; scope?: string; state: Record<string, string> }
    >();

    for (const item of items) {
      const id = idOf(item.key, item.scope);
      if (!groups.has(id)) {
        groups.set(id, { key: item.key, scope: item.scope, state: {} });
      }
    }

    for (const row of rows) {
      const id = idOf(row.service_key, row.scope);
      const group = groups.get(id);
      if (!group) continue;
      group.state[row.key] = (hexToBase64(row.value) ?? '') as string;
    }

    return Array.from(groups.values()).map((g) => ({
      key: g.key,
      ...(g.scope !== undefined ? { scope: g.scope } : {}),
      state: Object.entries(g.state).map(([name, value]) => ({ name, value })),
    }));
  });

  return new Response(JSON.stringify({ objects }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function emptyResponse() {
  return new Response(JSON.stringify({ objects: [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
