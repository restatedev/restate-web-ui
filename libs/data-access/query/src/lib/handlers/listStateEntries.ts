import { hexToBase64 } from '@restate/util/binary';
import { quoteSqlString, type QueryContext } from './shared';

// Values above this limit stay out of the page payload (only name + size are
// returned); the UI lazy-loads them one at a time via getState with a stateKey.
const ENTRY_VALUE_INLINE_LIMIT = 64 * 1024;
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 1000;

export interface ListStateEntriesArgs {
  scope?: string;
  after?: string;
  limit?: number;
}

export async function listStateEntries(
  this: QueryContext,
  service: string,
  key: string,
  args: ListStateEntriesArgs = {},
) {
  const limit = Math.min(
    Math.max(Math.floor(args.limit ?? DEFAULT_PAGE_SIZE), 1),
    MAX_PAGE_SIZE,
  );
  const hasScopeColumn = this.features.has('vqueues');
  // Pin the exact row identity: on scope-aware servers a scope-less state
  // object is `scope IS NULL` — without the pin, entries of the same key under
  // other scopes would bleed into the page. Servers without the `vqueues`
  // feature have no scope column, so it must not be referenced there.
  const scopeFilter = hasScopeColumn
    ? args.scope !== undefined
      ? ` AND scope = ${quoteSqlString(args.scope)}`
      : ' AND scope IS NULL'
    : '';
  // Keyset pagination: strictly-forward `key > after` cursor instead of
  // OFFSET, which would re-scan and re-sort everything before skipping.
  const afterFilter =
    args.after !== undefined ? ` AND key > ${quoteSqlString(args.after)}` : '';

  // One page of entries for a single state object:
  // - all predicates push down into the (partition-pruned) scan;
  // - ORDER BY key + LIMIT plans as a TopK, so memory is bounded to one page,
  //   and on servers with DataFusion dynamic-filter pushdown the TopK
  //   threshold feeds back into the scan and terminates it early (verified);
  //   older servers degrade to streaming the key's tail — slower, not a crash;
  // - the CASE keeps values > ENTRY_VALUE_INLINE_LIMIT out of the payload
  //   while still listing the entry with its size;
  // - LIMIT fetches one extra row to derive hasMore without a count query.
  const query = `SELECT key, value_length,
      CASE WHEN value_length <= ${ENTRY_VALUE_INLINE_LIMIT} THEN value END AS value
    FROM state
    WHERE service_name = ${quoteSqlString(service)}
      AND service_key = ${quoteSqlString(key)}${scopeFilter}${afterFilter}
    ORDER BY key
    LIMIT ${limit + 1}`;

  const { rows } = await this.query(query);
  const hasMore = rows.length > limit;
  const entries = rows.slice(0, limit).map((row) => {
    const value =
      row.value == null
        ? undefined
        : ((hexToBase64(String(row.value)) ?? '') as string);
    return {
      name: String(row.key),
      ...(value !== undefined ? { value } : {}),
      size: Number(row.value_length ?? 0),
    };
  });

  return new Response(JSON.stringify({ entries, hasMore }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
