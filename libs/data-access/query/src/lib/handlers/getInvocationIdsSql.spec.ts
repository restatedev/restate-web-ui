import { describe, expect, it } from 'vitest';
import { getInvocationIds } from './getInvocationIds';
import type { QueryContext } from './shared';

describe('getInvocationIds SQL', () => {
  it('selects the batch page with the complete V2 candidate query', async () => {
    const sql: string[] = [];
    const context = {
      restateVersion: '1.7.2',
      features: new Set(['vqueues']),
      query(statement: string) {
        sql.push(statement.trim());
        return Promise.resolve({ rows: [] });
      },
    } as unknown as QueryContext;

    const result = await getInvocationIds.call(context, {
      filters: [
        {
          field: 'vqueue_id',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'vq_orders',
        },
        {
          field: 'stage',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'inbox',
        },
      ],
      pageSize: 100,
      createdAfter: '2026-08-20T10:00:00.000Z',
    });

    expect(sql).toMatchInlineSnapshot(`
      [
        "SELECT
              v.entry_id AS id,
              v.created_at AS created_at
            FROM sys_vqueues v
            WHERE v.entry_kind = 'invocation'
              AND v.id = 'vq_orders'
              AND v.stage = 'inbox'
              AND v.created_at > '2026-08-20T10:00:00.000Z'
            ORDER BY v.created_at ASC NULLS LAST
            LIMIT 250",
      ]
    `);
    expect(result).toEqual({
      invocationIds: [],
      hasMore: false,
      lastCreatedAt: undefined,
    });
  });
});
