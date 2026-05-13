import type { FilterItem } from '@restate/data-access/admin-api-spec';
import { convertFilters } from '../convertFilters';
import type { QueryContext } from './shared';

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

  const hasVqueues = this.features.has('vqueues');
  const projection = hasVqueues ? 'service_key, scope' : 'service_key';

  const query = `SELECT DISTINCT ${projection}
    FROM state ${convertFilters(filtersWithService)}
    LIMIT 4500`;

  const { rows } = await this.query(query);

  const body = hasVqueues
    ? {
        items: rows.map((row) => ({
          key: row.service_key,
          ...(row.scope != null ? { scope: row.scope } : {}),
        })),
      }
    : { keys: rows.map((row) => row.service_key) };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
