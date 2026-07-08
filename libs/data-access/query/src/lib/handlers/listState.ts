import { hexToBase64 } from '@restate/util/binary';
import { quoteSqlString, type QueryContext } from './shared';

export interface ListStateItem {
  key: string;
  scope?: string;
}

export type ListStateArgs = { keys: string[] } | { items: ListStateItem[] };

// The preview response is bounded on two axes: PREVIEW_ROW_LIMIT caps rows and
// PREVIEW_VALUE_SIZE_LIMIT caps bytes per value, so the worst-case payload is
// ~PREVIEW_ROW_LIMIT × 2 × PREVIEW_VALUE_SIZE_LIMIT (values arrive hex-encoded).
// Entries with larger values are absent from the preview on purpose — they only
// show up when a row is expanded (listStateEntries).
const PREVIEW_VALUE_SIZE_LIMIT = 2 * 1024;
const PREVIEW_ROW_LIMIT = 1500;

type StateEntry = { name: string; value?: string; size: number };

function encodeStateValue(value: unknown) {
  return value == null
    ? undefined
    : ((hexToBase64(String(value)) ?? '') as string);
}

export async function listState(
  this: QueryContext,
  service: string,
  args: ListStateArgs,
) {
  const items: ListStateItem[] =
    'keys' in args ? args.keys.map((key) => ({ key })) : args.items;
  if (items.length === 0) {
    return emptyResponse();
  }

  const hasScopeColumn = this.features.has('vqueues');
  const idOf = (key: string, scope: string | null | undefined) =>
    `${key}\x00${scope ?? ''}`;

  const groups = new Map<
    string,
    { key: string; scope?: string; state: StateEntry[] }
  >();
  for (const item of items) {
    const id = idOf(item.key, item.scope);
    if (!groups.has(id)) {
      groups.set(id, {
        key: item.key,
        ...(item.scope !== undefined ? { scope: item.scope } : {}),
        state: [],
      });
    }
  }

  const serviceKeys = [...new Set(items.map((item) => item.key))];
  const scopes = [
    ...new Set(
      items.flatMap((item) => (item.scope !== undefined ? [item.scope] : [])),
    ),
  ];
  const hasScopelessItem = items.some((item) => item.scope === undefined);

  // Scope side of the coarse superset filter: exact (service_key, scope) pair
  // matching is done in JS below, so the SQL only needs a pushdown-friendly
  // superset of the page's scopes. Servers without the `vqueues` feature have
  // no scope column at all, so it must not be referenced there.
  let scopeFilter = '';
  if (hasScopeColumn) {
    const scopeIn =
      scopes.length > 0
        ? `scope IN (${scopes.map(quoteSqlString).join(', ')})`
        : '';
    if (scopeIn && hasScopelessItem) {
      scopeFilter = ` AND (${scopeIn} OR scope IS NULL)`;
    } else if (scopeIn) {
      scopeFilter = ` AND ${scopeIn}`;
    } else {
      scopeFilter = ' AND scope IS NULL';
    }
  }

  // Single bounded preview query for the whole page of state objects:
  // - plain column predicates (service_name, service_key IN, scope,
  //   value_length) all push down into the partition scan;
  // - value_length <= PREVIEW_VALUE_SIZE_LIMIT keeps big values from ever
  //   leaving the scanner — the preview is small values only by design;
  // - no ORDER BY, so the LIMIT terminates the scan as soon as enough rows
  //   match (an ordered limit would have to consume every matching row);
  // - which entries win when the LIMIT is hit is therefore arbitrary — the
  //   preview is best-effort and the UI always renders a trailing ellipsis.
  const previewQuery = `SELECT service_key, ${hasScopeColumn ? 'scope, ' : ''}key, value_length, value
    FROM state
    WHERE service_name = ${quoteSqlString(service)}
      AND service_key IN (${serviceKeys.map(quoteSqlString).join(', ')})${scopeFilter}
      AND value_length <= ${PREVIEW_VALUE_SIZE_LIMIT}
    LIMIT ${PREVIEW_ROW_LIMIT}`;

  const { rows } = await this.query(previewQuery);
  for (const row of rows) {
    const scope =
      hasScopeColumn && row.scope != null ? String(row.scope) : undefined;
    // The coarse filter can match (service_key, scope) combinations that are
    // not on the page (same key under another requested scope) — drop those.
    const group = groups.get(idOf(String(row.service_key), scope));
    if (!group) continue;
    const value = encodeStateValue(row.value);
    group.state.push({
      name: String(row.key),
      ...(value !== undefined ? { value } : {}),
      size: Number(row.value_length ?? 0),
    });
  }

  const objects = Array.from(groups.values()).map(({ key, scope, state }) => ({
    key,
    ...(scope !== undefined ? { scope } : {}),
    state: state.sort((a, b) => a.name.localeCompare(b.name)),
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
