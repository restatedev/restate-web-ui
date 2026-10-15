import { describe, expect, it, vi } from 'vitest';
import { getInbox } from './getInbox';
import { queryState } from './queryState';
import type { QueryContext } from './shared';

function createContext() {
  const query = vi.fn<
    (sql: string, id: string) => Promise<{ rows: unknown[] }>
  >(async () => ({ rows: [] }));
  const context = {
    query,
    adminApi: vi.fn(async () => ({
      handlers: [{ name: "add'one", ty: 'Exclusive' }],
    })),
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

  it('escapes the key, scope and handler names in inbox lookups', async () => {
    const { context, sql } = createContext();

    await getInbox.call(context, 'myObject3', "qa'key", 'inv_1', "a'b");

    expect(sql()).toMatchInlineSnapshot(`
      [
        "SELECT (num_inbox + num_running + num_suspended + num_paused) AS size FROM sys_vqueue_meta WHERE service_name = 'myObject3' AND lock_name = 'myObject3/qa''key' AND is_active = true AND scope = 'a''b'",
        "SELECT id, sequence_number FROM sys_vqueues WHERE entry_id = 'inv_1'",
        "SELECT id FROM sys_invocation WHERE target_service_key = 'qa''key' AND target_service_name = 'myObject3' AND status NOT IN ('completed', 'pending', 'scheduled') AND target_handler_name IN ('add''one') AND scope = 'a''b'",
      ]
    `);
  });
});
