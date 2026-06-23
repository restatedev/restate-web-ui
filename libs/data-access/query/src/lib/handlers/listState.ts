import { hexToBase64 } from '@restate/util/binary';
import {
  quoteSqlString,
  scopeClause,
  type QueryContext,
  type StateServiceType,
} from './shared';

export interface ListStateItem {
  key: string;
  scope?: string;
}

export type ListStateArgs = { keys: string[] } | { items: ListStateItem[] };
const INITIAL_STATE_VALUE_SIZE_LIMIT = 64 * 1024;

type StateRecord = Record<string, { value?: string; size: number }>;

function scopePredicate(scope: string | undefined) {
  return scope === undefined
    ? 'scope IS NULL'
    : `scope = ${quoteSqlString(scope)}`;
}

function encodeStateValue(value: unknown) {
  return value == null
    ? undefined
    : ((hexToBase64(String(value)) ?? '') as string);
}

function toStateEntries(state: StateRecord) {
  return Object.entries(state).map(([name, { value, size }]) => ({
    name,
    ...(value !== undefined ? { value } : {}),
    size,
  }));
}

export async function listState(
  this: QueryContext,
  service: string,
  args: ListStateArgs,
  serviceType?: StateServiceType,
) {
  if ('keys' in args) {
    return listStateByKeys.call(this, service, args.keys, serviceType);
  }
  return listStateByItems.call(this, service, args.items);
}

async function listStateByKeys(
  this: QueryContext,
  service: string,
  keys: string[],
  serviceType?: StateServiceType,
) {
  if (keys.length === 0) {
    return emptyResponse();
  }

  const hasScopeColumn = this.features.has('vqueues');
  const idOf = (key: string, scope: string | null | undefined) =>
    `${key}\x00${scope ?? ''}`;
  const scopeProjection = hasScopeColumn ? 'scope, ' : '';
  const metadataQuery = `SELECT service_key, ${scopeProjection}key, value_length
    FROM state WHERE service_name = ${quoteSqlString(service)} AND service_key IN (${keys
      .map(quoteSqlString)
      .join(', ')})${scopeClause(this, undefined, serviceType)}`;

  const groups = new Map<
    string,
    {
      key: string;
      scope?: string;
      state: StateRecord;
    }
  >();
  for (const key of keys) {
    const id = idOf(key, undefined);
    if (!groups.has(id)) groups.set(id, { key, state: {} });
  }

  const smallValues: {
    serviceKey: string;
    scope?: string;
    stateKey: string;
  }[] = [];
  const { rows: metadataRows } = await this.query(metadataQuery);
  for (const row of metadataRows) {
    const serviceKey = String(row.service_key);
    const scope =
      hasScopeColumn && row.scope != null ? String(row.scope) : undefined;
    const stateKey = String(row.key);
    const size = Number(row.value_length ?? 0);
    const id = idOf(serviceKey, scope);
    let group = groups.get(id);
    if (!group) {
      group = {
        key: serviceKey,
        ...(scope !== undefined ? { scope } : {}),
        state: {},
      };
      groups.set(id, group);
    }
    group.state[stateKey] = { size };
    if (size <= INITIAL_STATE_VALUE_SIZE_LIMIT) {
      smallValues.push({ serviceKey, scope, stateKey });
    }
  }

  if (smallValues.length > 0) {
    const smallValuePredicate = smallValues
      .map(({ serviceKey, scope, stateKey }) =>
        hasScopeColumn
          ? `(service_key = ${quoteSqlString(serviceKey)} AND ${scopePredicate(scope)} AND key = ${quoteSqlString(stateKey)})`
          : `(service_key = ${quoteSqlString(serviceKey)} AND key = ${quoteSqlString(stateKey)})`,
      )
      .join(' OR ');
    const valueQuery = `SELECT service_key, ${scopeProjection}key, value
      FROM state WHERE service_name = ${quoteSqlString(service)}${scopeClause(this, undefined, serviceType)}
        AND value_length <= ${INITIAL_STATE_VALUE_SIZE_LIMIT}
        AND (${smallValuePredicate})`;

    const { rows: valueRowsResult } = await this.query(valueQuery);
    for (const row of valueRowsResult) {
      const scope =
        hasScopeColumn && row.scope != null ? String(row.scope) : undefined;
      const group = groups.get(idOf(String(row.service_key), scope));
      const state = group?.state[String(row.key)];
      const value = encodeStateValue(row.value);
      if (state && value !== undefined) {
        state.value = value;
      }
    }
  }

  const objects = Array.from(groups.values()).map(({ key, scope, state }) => ({
    key,
    ...(scope !== undefined ? { scope } : {}),
    state: toStateEntries(state),
  }));

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

  const itemRows = items
    .map(({ key, scope }) =>
      scope !== undefined
        ? `(${quoteSqlString(key)}, ${quoteSqlString(scope)})`
        : `(${quoteSqlString(key)}, NULL)`,
    )
    .join(', ');

  const metadataQuery = `WITH pairs(service_key, scope) AS (VALUES ${itemRows})
    SELECT s.service_key, s.scope, s.key, s.value_length
    FROM state s
    JOIN pairs p
      ON s.service_key = p.service_key
     AND (s.scope = p.scope OR (s.scope IS NULL AND p.scope IS NULL))
    WHERE s.service_name = ${quoteSqlString(service)}`;

  const idOf = (key: string, scope: string | null | undefined) =>
    `${key}\x00${scope ?? ''}`;

  const groups = new Map<
    string,
    {
      key: string;
      scope?: string;
      state: StateRecord;
    }
  >();

  for (const item of items) {
    const id = idOf(item.key, item.scope);
    if (!groups.has(id)) {
      groups.set(id, { key: item.key, scope: item.scope, state: {} });
    }
  }

  const smallValues: {
    serviceKey: string;
    scope?: string;
    stateKey: string;
  }[] = [];
  const { rows: metadataRows } = await this.query(metadataQuery);
  for (const row of metadataRows) {
    const serviceKey = String(row.service_key);
    const scope = row.scope == null ? undefined : String(row.scope);
    const stateKey = String(row.key);
    const size = Number(row.value_length ?? 0);
    const group = groups.get(idOf(serviceKey, scope));
    if (!group) continue;
    group.state[stateKey] = { size };
    if (size <= INITIAL_STATE_VALUE_SIZE_LIMIT) {
      smallValues.push({ serviceKey, scope, stateKey });
    }
  }

  if (smallValues.length > 0) {
    const smallValuePredicate = smallValues
      .map(
        ({ serviceKey, scope, stateKey }) =>
          `(service_key = ${quoteSqlString(serviceKey)} AND ${scopePredicate(scope)} AND key = ${quoteSqlString(stateKey)})`,
      )
      .join(' OR ');
    const valueQuery = `SELECT service_key, scope, key, value
      FROM state WHERE service_name = ${quoteSqlString(service)}
        AND value_length <= ${INITIAL_STATE_VALUE_SIZE_LIMIT}
        AND (${smallValuePredicate})`;

    const { rows: valueRowsResult } = await this.query(valueQuery);
    for (const row of valueRowsResult) {
      const serviceKey = String(row.service_key);
      const scope = row.scope == null ? undefined : String(row.scope);
      const group = groups.get(idOf(serviceKey, scope));
      const state = group?.state[String(row.key)];
      const value = encodeStateValue(row.value);
      if (state && value !== undefined) {
        state.value = value;
      }
    }
  }

  const objects = Array.from(groups.values()).map((g) => ({
    key: g.key,
    ...(g.scope !== undefined ? { scope: g.scope } : {}),
    state: toStateEntries(g.state),
  }));

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
