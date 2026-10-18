import type { FilterItem } from '@restate/data-access-admin-api-spec';
import { convertFilters } from '../convertFilters.js';
import type { QueryContext } from './shared.js';

const STATE_OBJECTS_LIMIT = 300;

export async function queryState(
  this: QueryContext,
  service: string,
  args: { systemFilters?: FilterItem[]; stateFilter?: FilterItem },
) {
  const { systemFilters = [], stateFilter } = args;

  const filtersWithService: FilterItem[] = [
    {
      field: 'service_name',
      operation: 'EQUALS',
      value: service,
      type: 'STRING',
    },
    ...systemFilters,
    ...(stateFilter
      ? ([
          {
            field: 'key',
            operation: 'EQUALS',
            value: stateFilter.field,
            type: 'STRING',
          },
          {
            ...stateFilter,
            field: 'value',
          },
        ] as FilterItem[])
      : []),
  ];

  // Lists the state objects (DISTINCT service_key[, scope]) only — state
  // entries and values are fetched separately with their own bounds, per page
  // by listState and per object by listStateEntries, so this response stays
  // small no matter how many entries each object holds. Fetches one extra row
  // to report truncation ("300+") without a count query; with no ORDER BY the
  // limit stops the scan early, so which objects survive truncation is
  // arbitrary — filtering is the way to reach the rest.
  const query = `SELECT DISTINCT service_key, scope
    FROM state ${convertFilters(filtersWithService)}
    LIMIT ${STATE_OBJECTS_LIMIT + 1}`;

  const { rows: allRows } = await this.query(query, 'state/objects');
  const truncated = allRows.length > STATE_OBJECTS_LIMIT;
  const rows = allRows.slice(0, STATE_OBJECTS_LIMIT);

  const body = {
    items: rows.map((row) => ({
      key: row.service_key,
      ...(row.scope != null ? { scope: row.scope } : {}),
    })),
    ...(truncated ? { truncated } : {}),
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
