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
      pageSize: 1000,
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
            LIMIT 1000",
      ]
    `);
    expect(result).toEqual({
      invocationIds: [],
      hasMore: false,
      lastCreatedAt: undefined,
    });
  });

  it('refines a 1000-invocation batch page in groups of 500', async () => {
    const sql: string[] = [];
    const context = {
      restateVersion: '1.7.2',
      features: new Set(['vqueues']),
      query(statement: string, id: string) {
        sql.push(statement.trim());
        if (id === 'invocations-v2/best-effort-candidates') {
          return Promise.resolve({
            rows: Array.from({ length: 1000 }, (_, index) => ({
              id: `inv-${index}`,
              created_at: `2026-08-20T10:${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}.000Z`,
              raw_status: 'invoked',
            })),
          });
        }
        const ids = [...statement.matchAll(/'inv-(\d+)'/g)].map(
          ([, index]) => `inv-${index}`,
        );
        return Promise.resolve({
          rows: ids.map((entry_id) => ({
            entry_id,
            stage: 'inbox',
            status: 'backing-off',
          })),
        });
      },
    } as unknown as QueryContext;

    const result = await getInvocationIds.call(context, {
      filters: [
        {
          field: 'status',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'backing-off',
        },
        {
          field: 'target_handler_name',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'run',
        },
      ],
      pageSize: 1000,
    });

    const candidateStatusSql = (start: number) => `SELECT
        v.entry_id,
        v.stage,
        v.status
      FROM sys_vqueue_entry_status v
      WHERE v.entry_id IN (${Array.from(
        { length: 500 },
        (_, index) => `'inv-${start + index}'`,
      ).join(', ')})
        AND v.entry_kind = 'invocation'`;
    expect(sql).toEqual([
      `SELECT
        ss.id AS id,
        ss.created_at AS created_at
      FROM sys_invocation_status ss
      WHERE ss.status IN ('invoked')
        AND ss.target_handler_name = 'run'
      ORDER BY ss.created_at ASC NULLS LAST
      LIMIT 1000`,
      candidateStatusSql(0),
      candidateStatusSql(500),
    ]);
    expect(result.invocationIds).toHaveLength(1000);
  });

  it('retains completion fields for a terminal stored-status fallback', async () => {
    const sql: string[] = [];
    const context = {
      restateVersion: '1.7.2',
      features: new Set(['vqueues']),
      query(statement: string) {
        sql.push(statement.trim());
        return Promise.resolve({ rows: [] });
      },
    } as unknown as QueryContext;

    await getInvocationIds.call(context, {
      filters: [
        {
          field: 'status',
          type: 'STRING_LIST',
          operation: 'IN',
          value: ['backing-off', 'failed'],
        },
        {
          field: 'target_handler_name',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'run',
        },
      ],
      pageSize: 1000,
    });

    expect(sql).toMatchInlineSnapshot(`
      [
        "SELECT
              ss.id AS id,
              ss.created_at AS created_at,
              ss.status AS raw_status,
              ss.completion_result,
              ss.completion_failure
            FROM sys_invocation_status ss
            WHERE ss.status IN ('invoked', 'completed')
              AND ss.target_handler_name = 'run'
            ORDER BY ss.created_at ASC NULLS LAST
            LIMIT 1000",
      ]
    `);
  });
});
