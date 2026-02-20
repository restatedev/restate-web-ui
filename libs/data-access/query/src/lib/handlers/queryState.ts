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

  const query = `SELECT DISTINCT service_key
    FROM state ${convertFilters(filtersWithService)}
    LIMIT 4500`;

  const resultsPromise: Promise<{
    keys: string[];
  }> = this.query(query).then(async ({ rows }) => ({
    keys: rows.map(({ service_key }) => service_key),
  }));

  const [{ keys }] = await Promise.all([resultsPromise]);

  return new Response(JSON.stringify({ keys }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
