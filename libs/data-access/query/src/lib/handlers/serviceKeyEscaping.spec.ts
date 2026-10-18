import { describe, expect, it, vi } from 'vitest';
import { queryState } from './queryState.js';
import type { QueryContext } from './shared.js';

function createContext() {
  const query = vi.fn<
    (sql: string, id: string) => Promise<{ rows: unknown[] }>
  >(async () => ({ rows: [] }));
  const context = {
    query,
    features: new Set(),
    baseUrl: '',
  } as unknown as QueryContext;
  return {
    context,
    sql: () => query.mock.calls.map(([statement]) => statement.trim()),
  };
}

describe('service keys with quotes', () => {
  it('escapes state object filters', async () => {
    const { context, sql } = createContext();

    await queryState.call(context, 'myObject3', {
      systemFilters: [
        {
          field: 'service_key',
          type: 'STRING',
          operation: 'EQUALS',
          value: "qa'key%_1013",
        },
        {
          field: 'scope',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'codexqa-a-1013',
        },
      ],
    });

    expect(sql()).toMatchInlineSnapshot(`
      [
        "SELECT DISTINCT service_key, scope
          FROM state WHERE "service_name" = 'myObject3' AND "service_key" = 'qa''key%_1013' AND "scope" = 'codexqa-a-1013'
          LIMIT 301",
      ]
    `);
  });
});
