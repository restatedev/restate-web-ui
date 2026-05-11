import type { FilterItem } from '@restate/data-access/admin-api-spec';
import { convertFilters } from '../convertFilters';
import type { QueryContext } from './shared';

export async function queryState(
  this: QueryContext,
  service: string,
  filters: FilterItem[],
) {
  if (filters.length > 1) {
    throw new Error('Only one filter is supported');
  }

  const [filter] = filters;
  const filtersWithService: FilterItem[] = [
    {
      field: 'service_name',
      operation: 'EQUALS',
      value: service,
      type: 'STRING',
    },
    ...(filter && filter.field !== 'service_key'
      ? ([
          {
            field: 'key',
            operation: 'EQUALS',
            value: filter.field,
            type: 'STRING',
          },
          {
            ...filter,
            field: 'value',
          },
        ] as FilterItem[])
      : []),
    ...(filter && filter.field === 'service_key' ? [filter] : []),
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
