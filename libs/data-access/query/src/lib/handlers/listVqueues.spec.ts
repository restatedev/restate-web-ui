import { describe, expect, it, vi } from 'vitest';
import { listVqueues } from './listVqueues';
import type { QueryContext } from './shared';

const vqueue = {
  id: 'vq_checkout',
  queue_is_paused: false,
  service_name: 'CheckoutService',
  scope: 'checkout',
  limit_key: 'tenant/priority',
  lock_name: 'CheckoutService/cart-123',
  last_enqueued_at: '2026-08-12T14:28:52.633Z',
  last_start_at: '2026-08-12T14:28:53.633Z',
  last_attempt_at: '2026-08-12T14:28:54.633Z',
  last_finish_at: '2026-08-12T14:28:55.633Z',
  avg_queue_duration: 'PT5.786S',
  avg_inbox_duration: 'PT2.1S',
  avg_run_duration: 'PT3.2S',
  avg_suspension_duration: 'PT0.4S',
  avg_end_to_end_duration: 'PT11.486S',
  avg_blocked_on_concurrency_rules: 'PT1.2S',
  avg_blocked_on_invoker_concurrency: 'PT0.2S',
  avg_blocked_on_invoker_throttling: 'PT0.1S',
  avg_blocked_on_lock: 'PT0.3S',
  num_inbox: 3,
  num_running: 1,
  num_suspended: 0,
  num_paused: 0,
  num_finished: 12,
};

const scheduler = {
  id: 'vq_checkout',
  status: 'blocked',
  blocked_on: 'limit-key-concurrency',
  blocked_on_json: JSON.stringify({
    resource: 'limit-key-concurrency',
    scope: 'checkout',
    limit_key: 'tenant/priority',
    blocked_level: 'level2',
    blocked_rule: 'checkout/*/*',
  }),
  head_entry_id: 'inv_checkout',
  scheduled_at: null,
  invoker_concurrency_block_duration: 'PT0S',
  throttling_rules_block_duration: 'PT0S',
  invoker_throttling_block_duration: 'PT0S',
  invoker_memory_block_duration: 'PT0S',
  concurrency_rules_block_duration: 'PT1.2S',
  lock_block_duration: 'PT0S',
  deployment_concurrency_block_duration: 'PT0S',
};

function querySql(query: ReturnType<typeof vi.fn>) {
  return query.mock.calls.map(([sql]) => sql);
}

describe('listVqueues', () => {
  it('returns a bounded VQueue snapshot without default ordering', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [vqueue] })
      .mockResolvedValueOnce({ rows: [scheduler] });
    const context = { query } as unknown as QueryContext;

    const response = await listVqueues.call(context);

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT id, queue_is_paused, service_name, scope, limit_key, lock_name, last_enqueued_at, last_start_at, last_attempt_at, last_finish_at, avg_queue_duration, avg_inbox_duration, avg_run_duration, avg_suspension_duration, avg_end_to_end_duration, avg_blocked_on_concurrency_rules, avg_blocked_on_invoker_concurrency, avg_blocked_on_invoker_throttling, avg_blocked_on_lock, num_inbox, num_running, num_suspended, num_paused, num_finished
          FROM sys_vqueue_meta
          LIMIT 251",
        "SELECT
        id,
        status,
        blocked_on,
        blocked_on_json,
        head_entry_id,
        scheduled_at,
        invoker_concurrency_block_duration,
        throttling_rules_block_duration,
        invoker_throttling_block_duration,
        invoker_memory_block_duration,
        concurrency_rules_block_duration,
        lock_block_duration,
        deployment_concurrency_block_duration
      FROM sys_scheduler
      WHERE id IN ('vq_checkout')",
      ]
    `);
    expect(await response.json()).toEqual({
      vqueues: [
        {
          ...vqueue,
          scheduler: {
            status: 'blocked',
            headEntryId: 'inv_checkout',
            blockedOn: 'limit-key-concurrency',
            blockedResource: {
              resource: 'limit-key-concurrency',
              scope: 'checkout',
              limitKey: 'tenant/priority',
              blockedLevel: 'level2',
              blockedRule: 'checkout/*/*',
            },
            blockedDuration: 'PT1.2S',
          },
        },
      ],
      hasMore: false,
    });
  });

  it('filters VQueue IDs by exact identity', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const context = { query } as unknown as QueryContext;

    await listVqueues.call(context, {
      filters: [
        {
          field: 'id',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'vq_checkout',
        },
      ],
    });

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT id, queue_is_paused, service_name, scope, limit_key, lock_name, last_enqueued_at, last_start_at, last_attempt_at, last_finish_at, avg_queue_duration, avg_inbox_duration, avg_run_duration, avg_suspension_duration, avg_end_to_end_duration, avg_blocked_on_concurrency_rules, avg_blocked_on_invoker_concurrency, avg_blocked_on_invoker_throttling, avg_blocked_on_lock, num_inbox, num_running, num_suspended, num_paused, num_finished
          FROM sys_vqueue_meta
          WHERE id = 'vq_checkout'
          LIMIT 251",
      ]
    `);
  });

  it('combines specific structured filters with AND', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const context = { query } as unknown as QueryContext;

    await listVqueues.call(context, {
      filters: [
        {
          field: 'service',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'CheckoutService',
        },
        {
          field: 'limitKey',
          type: 'STRING',
          operation: 'CONTAINS',
          value: 'priority_%',
        },
        {
          field: 'lockName',
          type: 'NULL',
          operation: 'IS_NOT',
        },
      ],
    });

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT id, queue_is_paused, service_name, scope, limit_key, lock_name, last_enqueued_at, last_start_at, last_attempt_at, last_finish_at, avg_queue_duration, avg_inbox_duration, avg_run_duration, avg_suspension_duration, avg_end_to_end_duration, avg_blocked_on_concurrency_rules, avg_blocked_on_invoker_concurrency, avg_blocked_on_invoker_throttling, avg_blocked_on_lock, num_inbox, num_running, num_suspended, num_paused, num_finished
          FROM sys_vqueue_meta
          WHERE service_name = 'CheckoutService' AND limit_key ILIKE '%priority\\_\\%%' AND lock_name IS NOT NULL
          LIMIT 251",
      ]
    `);
  });

  it('matches a literal scope substring and an exact whole limit key', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const context = { query } as unknown as QueryContext;

    await listVqueues.call(context, {
      filters: [
        {
          field: 'scope',
          type: 'STRING',
          operation: 'CONTAINS',
          value: 'Ac_me%',
        },
        {
          field: 'limitKey',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'Team/EU',
        },
      ],
    });

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT id, queue_is_paused, service_name, scope, limit_key, lock_name, last_enqueued_at, last_start_at, last_attempt_at, last_finish_at, avg_queue_duration, avg_inbox_duration, avg_run_duration, avg_suspension_duration, avg_end_to_end_duration, avg_blocked_on_concurrency_rules, avg_blocked_on_invoker_concurrency, avg_blocked_on_invoker_throttling, avg_blocked_on_lock, num_inbox, num_running, num_suspended, num_paused, num_finished
          FROM sys_vqueue_meta
          WHERE scope ILIKE '%Ac\\_me\\%%' AND limit_key = 'Team/EU'
          LIMIT 251",
      ]
    `);
  });

  it('matches exact L1 and L2 limit-key segments', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const context = { query } as unknown as QueryContext;

    await listVqueues.call(context, {
      filters: [
        {
          field: 'scope',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'Acme',
        },
        {
          field: 'l1',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'Team_A',
        },
        {
          field: 'l2',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'Priority_%',
        },
      ],
    });

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT id, queue_is_paused, service_name, scope, limit_key, lock_name, last_enqueued_at, last_start_at, last_attempt_at, last_finish_at, avg_queue_duration, avg_inbox_duration, avg_run_duration, avg_suspension_duration, avg_end_to_end_duration, avg_blocked_on_concurrency_rules, avg_blocked_on_invoker_concurrency, avg_blocked_on_invoker_throttling, avg_blocked_on_lock, num_inbox, num_running, num_suspended, num_paused, num_finished
          FROM sys_vqueue_meta
          WHERE scope = 'Acme' AND (limit_key = 'Team_A' OR starts_with(limit_key, 'Team_A/')) AND ends_with(limit_key, '/Priority_%')
          LIMIT 251",
      ]
    `);
  });

  it('sorts scope and limit key together', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const context = { query } as unknown as QueryContext;

    await listVqueues.call(context, {
      sort: { field: 'scope', order: 'ASC' },
    });

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT id, queue_is_paused, service_name, scope, limit_key, lock_name, last_enqueued_at, last_start_at, last_attempt_at, last_finish_at, avg_queue_duration, avg_inbox_duration, avg_run_duration, avg_suspension_duration, avg_end_to_end_duration, avg_blocked_on_concurrency_rules, avg_blocked_on_invoker_concurrency, avg_blocked_on_invoker_throttling, avg_blocked_on_lock, num_inbox, num_running, num_suspended, num_paused, num_finished
          FROM sys_vqueue_meta
          ORDER BY COALESCE(scope, '') ASC, COALESCE(limit_key, '') ASC, (COALESCE(num_inbox, 0) + COALESCE(num_running, 0) + COALESCE(num_suspended, 0) + COALESCE(num_paused, 0)) DESC, GREATEST(last_enqueued_at, last_start_at, last_attempt_at, last_finish_at) DESC NULLS LAST, COALESCE(service_name, '') ASC, id ASC
          LIMIT 251",
      ]
    `);
  });

  it('sorts by every stage count', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const context = { query } as unknown as QueryContext;

    for (const field of [
      'inbox',
      'running',
      'suspended',
      'paused',
      'finished',
      'unfinished',
    ] as const) {
      await listVqueues.call(context, {
        sort: { field, order: 'DESC' },
      });
    }

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT id, queue_is_paused, service_name, scope, limit_key, lock_name, last_enqueued_at, last_start_at, last_attempt_at, last_finish_at, avg_queue_duration, avg_inbox_duration, avg_run_duration, avg_suspension_duration, avg_end_to_end_duration, avg_blocked_on_concurrency_rules, avg_blocked_on_invoker_concurrency, avg_blocked_on_invoker_throttling, avg_blocked_on_lock, num_inbox, num_running, num_suspended, num_paused, num_finished
          FROM sys_vqueue_meta
          ORDER BY COALESCE(num_inbox, 0) DESC, (COALESCE(num_inbox, 0) + COALESCE(num_running, 0) + COALESCE(num_suspended, 0) + COALESCE(num_paused, 0)) DESC, GREATEST(last_enqueued_at, last_start_at, last_attempt_at, last_finish_at) DESC NULLS LAST, COALESCE(service_name, '') ASC, id ASC
          LIMIT 251",
        "SELECT id, queue_is_paused, service_name, scope, limit_key, lock_name, last_enqueued_at, last_start_at, last_attempt_at, last_finish_at, avg_queue_duration, avg_inbox_duration, avg_run_duration, avg_suspension_duration, avg_end_to_end_duration, avg_blocked_on_concurrency_rules, avg_blocked_on_invoker_concurrency, avg_blocked_on_invoker_throttling, avg_blocked_on_lock, num_inbox, num_running, num_suspended, num_paused, num_finished
          FROM sys_vqueue_meta
          ORDER BY COALESCE(num_running, 0) DESC, (COALESCE(num_inbox, 0) + COALESCE(num_running, 0) + COALESCE(num_suspended, 0) + COALESCE(num_paused, 0)) DESC, GREATEST(last_enqueued_at, last_start_at, last_attempt_at, last_finish_at) DESC NULLS LAST, COALESCE(service_name, '') ASC, id ASC
          LIMIT 251",
        "SELECT id, queue_is_paused, service_name, scope, limit_key, lock_name, last_enqueued_at, last_start_at, last_attempt_at, last_finish_at, avg_queue_duration, avg_inbox_duration, avg_run_duration, avg_suspension_duration, avg_end_to_end_duration, avg_blocked_on_concurrency_rules, avg_blocked_on_invoker_concurrency, avg_blocked_on_invoker_throttling, avg_blocked_on_lock, num_inbox, num_running, num_suspended, num_paused, num_finished
          FROM sys_vqueue_meta
          ORDER BY COALESCE(num_suspended, 0) DESC, (COALESCE(num_inbox, 0) + COALESCE(num_running, 0) + COALESCE(num_suspended, 0) + COALESCE(num_paused, 0)) DESC, GREATEST(last_enqueued_at, last_start_at, last_attempt_at, last_finish_at) DESC NULLS LAST, COALESCE(service_name, '') ASC, id ASC
          LIMIT 251",
        "SELECT id, queue_is_paused, service_name, scope, limit_key, lock_name, last_enqueued_at, last_start_at, last_attempt_at, last_finish_at, avg_queue_duration, avg_inbox_duration, avg_run_duration, avg_suspension_duration, avg_end_to_end_duration, avg_blocked_on_concurrency_rules, avg_blocked_on_invoker_concurrency, avg_blocked_on_invoker_throttling, avg_blocked_on_lock, num_inbox, num_running, num_suspended, num_paused, num_finished
          FROM sys_vqueue_meta
          ORDER BY COALESCE(num_paused, 0) DESC, (COALESCE(num_inbox, 0) + COALESCE(num_running, 0) + COALESCE(num_suspended, 0) + COALESCE(num_paused, 0)) DESC, GREATEST(last_enqueued_at, last_start_at, last_attempt_at, last_finish_at) DESC NULLS LAST, COALESCE(service_name, '') ASC, id ASC
          LIMIT 251",
        "SELECT id, queue_is_paused, service_name, scope, limit_key, lock_name, last_enqueued_at, last_start_at, last_attempt_at, last_finish_at, avg_queue_duration, avg_inbox_duration, avg_run_duration, avg_suspension_duration, avg_end_to_end_duration, avg_blocked_on_concurrency_rules, avg_blocked_on_invoker_concurrency, avg_blocked_on_invoker_throttling, avg_blocked_on_lock, num_inbox, num_running, num_suspended, num_paused, num_finished
          FROM sys_vqueue_meta
          ORDER BY COALESCE(num_finished, 0) DESC, (COALESCE(num_inbox, 0) + COALESCE(num_running, 0) + COALESCE(num_suspended, 0) + COALESCE(num_paused, 0)) DESC, GREATEST(last_enqueued_at, last_start_at, last_attempt_at, last_finish_at) DESC NULLS LAST, COALESCE(service_name, '') ASC, id ASC
          LIMIT 251",
        "SELECT id, queue_is_paused, service_name, scope, limit_key, lock_name, last_enqueued_at, last_start_at, last_attempt_at, last_finish_at, avg_queue_duration, avg_inbox_duration, avg_run_duration, avg_suspension_duration, avg_end_to_end_duration, avg_blocked_on_concurrency_rules, avg_blocked_on_invoker_concurrency, avg_blocked_on_invoker_throttling, avg_blocked_on_lock, num_inbox, num_running, num_suspended, num_paused, num_finished
          FROM sys_vqueue_meta
          ORDER BY (COALESCE(num_inbox, 0) + COALESCE(num_running, 0) + COALESCE(num_suspended, 0) + COALESCE(num_paused, 0)) DESC, GREATEST(last_enqueued_at, last_start_at, last_attempt_at, last_finish_at) DESC NULLS LAST, COALESCE(service_name, '') ASC, id ASC
          LIMIT 251",
      ]
    `);
  });

  it('reports a truncated bounded result', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [vqueue, { ...vqueue, id: 'vq_payments' }],
      })
      .mockResolvedValueOnce({ rows: [] });
    const context = { query } as unknown as QueryContext;

    const response = await listVqueues.call(context, { limit: 1 });

    expect(await response.json()).toEqual({
      vqueues: [vqueue],
      hasMore: true,
    });
    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT id, queue_is_paused, service_name, scope, limit_key, lock_name, last_enqueued_at, last_start_at, last_attempt_at, last_finish_at, avg_queue_duration, avg_inbox_duration, avg_run_duration, avg_suspension_duration, avg_end_to_end_duration, avg_blocked_on_concurrency_rules, avg_blocked_on_invoker_concurrency, avg_blocked_on_invoker_throttling, avg_blocked_on_lock, num_inbox, num_running, num_suspended, num_paused, num_finished
          FROM sys_vqueue_meta
          LIMIT 2",
        "SELECT
        id,
        status,
        blocked_on,
        blocked_on_json,
        head_entry_id,
        scheduled_at,
        invoker_concurrency_block_duration,
        throttling_rules_block_duration,
        invoker_throttling_block_duration,
        invoker_memory_block_duration,
        concurrency_rules_block_duration,
        lock_block_duration,
        deployment_concurrency_block_duration
      FROM sys_scheduler
      WHERE id IN ('vq_checkout')",
      ]
    `);
  });

  it('rejects unsupported sorts and filters before querying', async () => {
    const query = vi.fn();
    const context = { query } as unknown as QueryContext;

    const sortFieldResponse = await listVqueues.call(context, {
      sort: { field: 'createdAt', order: 'ASC' },
    } as never);
    const sortOrderResponse = await listVqueues.call(context, {
      sort: { field: 'service', order: 'SIDEWAYS' },
    } as never);
    const filtersShapeResponse = await listVqueues.call(context, {
      filters: {},
    } as never);
    const filterFieldResponse = await listVqueues.call(context, {
      filters: [
        {
          field: 'active',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'true',
        },
      ],
    } as never);
    const filterOperationResponse = await listVqueues.call(context, {
      filters: [
        {
          field: 'inbox',
          type: 'NUMBER',
          operation: 'EQUALS',
          value: 1,
        },
      ],
    } as never);
    const idContainsResponse = await listVqueues.call(context, {
      filters: [
        {
          field: 'id',
          type: 'STRING',
          operation: 'CONTAINS',
          value: 'checkout',
        },
      ],
    } as never);
    const idNullResponse = await listVqueues.call(context, {
      filters: [
        {
          field: 'id',
          type: 'NULL',
          operation: 'IS',
        },
      ],
    } as never);
    const l1ContainsResponse = await listVqueues.call(context, {
      filters: [
        {
          field: 'l1',
          type: 'STRING',
          operation: 'CONTAINS',
          value: 'team',
        },
      ],
    } as never);

    expect(sortFieldResponse.status).toBe(400);
    expect(sortOrderResponse.status).toBe(400);
    expect(filtersShapeResponse.status).toBe(400);
    expect(filterFieldResponse.status).toBe(400);
    expect(filterOperationResponse.status).toBe(400);
    expect(idContainsResponse.status).toBe(400);
    expect(idNullResponse.status).toBe(400);
    expect(l1ContainsResponse.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });
});
