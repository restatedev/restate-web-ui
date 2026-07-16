import type { FilterItem } from '@restate/data-access/admin-api-spec';
import { convertFilters } from '../convertFilters';
import {
  shouldFilterScopeIsNull,
  type QueryContext,
  type StateServiceType,
} from './shared';

const STATE_OBJECTS_LIMIT = 300;

export async function queryState(
  this: QueryContext,
  service: string,
  args: { systemFilters?: FilterItem[]; stateFilter?: FilterItem },
  serviceType?: StateServiceType,
) {
  const { systemFilters = [], stateFilter } = args;

  const filtersScopeIsNull = shouldFilterScopeIsNull(this, serviceType);
  const supportedSystemFilters = filtersScopeIsNull
    ? systemFilters.filter((filter) => filter.field !== 'scope')
    : systemFilters;
  const hasScopeFilter = supportedSystemFilters.some(
    (filter) => filter.field === 'scope',
  );
  const filtersWithService: FilterItem[] = [
    {
      field: 'service_name',
      operation: 'EQUALS',
      value: service,
      type: 'STRING',
    },
    ...(!hasScopeFilter && filtersScopeIsNull
      ? ([{ field: 'scope', operation: 'IS', type: 'NULL' }] as FilterItem[])
      : []),
    ...supportedSystemFilters,
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

  const hasVqueues = this.features.has('vqueues');
  const projection = hasVqueues ? 'service_key, scope' : 'service_key';

  // Lists the state objects (DISTINCT service_key[, scope]) only — state
  // entries and values are fetched separately with their own bounds, per page
  // by listState and per object by listStateEntries, so this response stays
  // small no matter how many entries each object holds. Fetches one extra row
  // to report truncation ("300+") without a count query; with no ORDER BY the
  // limit stops the scan early, so which objects survive truncation is
  // arbitrary — filtering is the way to reach the rest.
  const query = `SELECT DISTINCT ${projection}
    FROM state ${convertFilters(filtersWithService)}
    LIMIT ${STATE_OBJECTS_LIMIT + 1}`;

  const { rows: allRows } = await this.query(query);
  const truncated = allRows.length > STATE_OBJECTS_LIMIT;
  const rows = allRows.slice(0, STATE_OBJECTS_LIMIT);

  const body = hasVqueues
    ? {
        items: rows.map((row) => ({
          key: row.service_key,
          ...(row.scope != null ? { scope: row.scope } : {}),
        })),
        ...(truncated ? { truncated } : {}),
      }
    : {
        keys: rows.map((row) => row.service_key),
        ...(truncated ? { truncated } : {}),
      };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
