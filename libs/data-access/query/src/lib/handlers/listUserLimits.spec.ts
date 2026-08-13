import { describe, expect, it, vi } from 'vitest';
import { listLimitCountersForRule, listUserLimits } from './listUserLimits';
import type { QueryContext } from './shared';

const counter = {
  scope: 'tenant',
  l1: 'checkout',
  l2: null,
  level: '1',
  usage: 3,
  concurrency_limit: 5,
  rule_pattern: 'tenant/*',
  available: 2,
  num_waiters: 1,
};

function querySql(query: ReturnType<typeof vi.fn>) {
  return query.mock.calls.map(([sql]) => sql);
}

describe('listUserLimits', () => {
  it('bounds the global counter list', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [counter] });
    const context = { query } as unknown as QueryContext;

    const response = await listUserLimits.call(context);

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT scope, l1, l2, level, usage, concurrency_limit, rule_pattern, available, num_waiters
          FROM sys_user_limits
          WHERE rule_pattern IS NOT NULL
          ORDER BY COALESCE(num_waiters, 0) DESC, (concurrency_limit IS NULL) ASC, COALESCE(CAST(usage AS DOUBLE) / concurrency_limit, 0) DESC, COALESCE(rule_pattern, '') ASC, scope ASC, COALESCE(l1, '') ASC, COALESCE(l2, '') ASC
          LIMIT 1001",
      ]
    `);
    expect(await response.json()).toEqual({
      limits: [counter],
      hasMore: false,
    });
  });

  it('includes unlimited counters only when requested', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const context = { query } as unknown as QueryContext;

    await listUserLimits.call(context, { includeUnlimited: true });

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT scope, l1, l2, level, usage, concurrency_limit, rule_pattern, available, num_waiters
          FROM sys_user_limits
          ORDER BY COALESCE(num_waiters, 0) DESC, (concurrency_limit IS NULL) ASC, COALESCE(CAST(usage AS DOUBLE) / concurrency_limit, 0) DESC, COALESCE(rule_pattern, '') ASC, scope ASC, COALESCE(l1, '') ASC, COALESCE(l2, '') ASC
          LIMIT 1001",
      ]
    `);
  });

  it('filters counters by an exact rule pattern', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const context = { query } as unknown as QueryContext;

    await listUserLimits.call(context, {
      includeUnlimited: true,
      rulePattern: "tenant's/*",
    });

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT scope, l1, l2, level, usage, concurrency_limit, rule_pattern, available, num_waiters
          FROM sys_user_limits
          WHERE rule_pattern = 'tenant''s/*'
          ORDER BY COALESCE(num_waiters, 0) DESC, (concurrency_limit IS NULL) ASC, COALESCE(CAST(usage AS DOUBLE) / concurrency_limit, 0) DESC, COALESCE(rule_pattern, '') ASC, scope ASC, COALESCE(l1, '') ASC, COALESCE(l2, '') ASC
          LIMIT 1001",
      ]
    `);
  });

  it('sorts usage by utilization and ranks unlimited counters last', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const context = { query } as unknown as QueryContext;

    await listUserLimits.call(context, {
      sort: { field: 'usage', order: 'DESC' },
    });

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT scope, l1, l2, level, usage, concurrency_limit, rule_pattern, available, num_waiters
          FROM sys_user_limits
          WHERE rule_pattern IS NOT NULL
          ORDER BY (concurrency_limit IS NULL) ASC, COALESCE(CAST(usage AS DOUBLE) / concurrency_limit, 0) DESC, COALESCE(num_waiters, 0) DESC, COALESCE(rule_pattern, '') ASC, scope ASC, COALESCE(l1, '') ASC, COALESCE(l2, '') ASC
          LIMIT 1001",
      ]
    `);
  });

  it('sorts waiting first, then usage and rule pattern', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const context = { query } as unknown as QueryContext;

    await listUserLimits.call(context, {
      sort: { field: 'waiting', order: 'ASC' },
    });

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT scope, l1, l2, level, usage, concurrency_limit, rule_pattern, available, num_waiters
          FROM sys_user_limits
          WHERE rule_pattern IS NOT NULL
          ORDER BY COALESCE(num_waiters, 0) ASC, (concurrency_limit IS NULL) ASC, COALESCE(CAST(usage AS DOUBLE) / concurrency_limit, 0) DESC, COALESCE(rule_pattern, '') ASC, scope ASC, COALESCE(l1, '') ASC, COALESCE(l2, '') ASC
          LIMIT 1001",
      ]
    `);
  });

  it('sorts by rule pattern', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const context = { query } as unknown as QueryContext;

    await listUserLimits.call(context, {
      sort: { field: 'pattern', order: 'ASC' },
    });

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT scope, l1, l2, level, usage, concurrency_limit, rule_pattern, available, num_waiters
          FROM sys_user_limits
          WHERE rule_pattern IS NOT NULL
          ORDER BY COALESCE(rule_pattern, '') ASC, COALESCE(num_waiters, 0) DESC, (concurrency_limit IS NULL) ASC, COALESCE(CAST(usage AS DOUBLE) / concurrency_limit, 0) DESC, scope ASC, COALESCE(l1, '') ASC, COALESCE(l2, '') ASC
          LIMIT 1001",
      ]
    `);
  });

  it('rejects unsupported sort fields', async () => {
    const query = vi.fn();
    const context = { query } as unknown as QueryContext;

    const response = await listUserLimits.call(context, {
      sort: { field: 'limit', order: 'ASC' },
    } as never);

    expect(response.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it('pushes search into the bounded server query', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const context = { query } as unknown as QueryContext;

    await listUserLimits.call(context, { search: "Tenant's checkout" });

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT scope, l1, l2, level, usage, concurrency_limit, rule_pattern, available, num_waiters
          FROM sys_user_limits
          WHERE rule_pattern IS NOT NULL AND (
          LOWER(COALESCE(scope, '')) LIKE '%tenant''s checkout%'
          OR LOWER(COALESCE(l1, '')) LIKE '%tenant''s checkout%'
          OR LOWER(COALESCE(l2, '')) LIKE '%tenant''s checkout%'
        )
          ORDER BY COALESCE(num_waiters, 0) DESC, (concurrency_limit IS NULL) ASC, COALESCE(CAST(usage AS DOUBLE) / concurrency_limit, 0) DESC, COALESCE(rule_pattern, '') ASC, scope ASC, COALESCE(l1, '') ASC, COALESCE(l2, '') ASC
          LIMIT 1001",
      ]
    `);
  });

  it('splits hierarchical searches into positional filters', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const context = { query } as unknown as QueryContext;

    await listUserLimits.call(context, {
      search: 'Tenant / Checkout / Priority',
    });

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT scope, l1, l2, level, usage, concurrency_limit, rule_pattern, available, num_waiters
          FROM sys_user_limits
          WHERE rule_pattern IS NOT NULL AND (
          LOWER(COALESCE(scope, '')) LIKE '%tenant%'
          AND LOWER(COALESCE(l1, '')) LIKE '%checkout%'
          AND LOWER(COALESCE(l2, '')) LIKE '%priority%'
        )
          ORDER BY COALESCE(num_waiters, 0) DESC, (concurrency_limit IS NULL) ASC, COALESCE(CAST(usage AS DOUBLE) / concurrency_limit, 0) DESC, COALESCE(rule_pattern, '') ASC, scope ASC, COALESCE(l1, '') ASC, COALESCE(l2, '') ASC
          LIMIT 1001",
      ]
    `);
  });

  it('pushes structured scope and whole limit-key filters into the query', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const context = { query } as unknown as QueryContext;

    await listUserLimits.call(context, {
      filters: [
        {
          field: 'scope',
          type: 'STRING',
          operation: 'CONTAINS',
          value: "Tenant's",
        },
        {
          field: 'limitKey',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'Checkout/Priority',
        },
      ],
    });

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT scope, l1, l2, level, usage, concurrency_limit, rule_pattern, available, num_waiters
          FROM sys_user_limits
          WHERE rule_pattern IS NOT NULL AND strpos(LOWER(COALESCE(scope, '')), 'tenant''s') > 0 AND (LOWER(COALESCE(l1, '')) = 'checkout' AND LOWER(COALESCE(l2, '')) = 'priority')
          ORDER BY COALESCE(num_waiters, 0) DESC, (concurrency_limit IS NULL) ASC, COALESCE(CAST(usage AS DOUBLE) / concurrency_limit, 0) DESC, COALESCE(rule_pattern, '') ASC, scope ASC, COALESCE(l1, '') ASC, COALESCE(l2, '') ASC
          LIMIT 1001",
      ]
    `);
  });

  it('matches a one-segment whole limit key without an L2 value', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const context = { query } as unknown as QueryContext;

    await listUserLimits.call(context, {
      filters: [
        {
          field: 'limitKey',
          type: 'STRING',
          operation: 'EQUALS',
          value: 'Checkout',
        },
      ],
    });

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT scope, l1, l2, level, usage, concurrency_limit, rule_pattern, available, num_waiters
          FROM sys_user_limits
          WHERE rule_pattern IS NOT NULL AND (LOWER(COALESCE(l1, '')) = 'checkout' AND l2 IS NULL)
          ORDER BY COALESCE(num_waiters, 0) DESC, (concurrency_limit IS NULL) ASC, COALESCE(CAST(usage AS DOUBLE) / concurrency_limit, 0) DESC, COALESCE(rule_pattern, '') ASC, scope ASC, COALESCE(l1, '') ASC, COALESCE(l2, '') ASC
          LIMIT 1001",
      ]
    `);
  });

  it('supports literal contains for an assembled limit key', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const context = { query } as unknown as QueryContext;

    await listUserLimits.call(context, {
      filters: [
        {
          field: 'limitKey',
          type: 'STRING',
          operation: 'CONTAINS',
          value: 'out/pri',
        },
      ],
    });

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT scope, l1, l2, level, usage, concurrency_limit, rule_pattern, available, num_waiters
          FROM sys_user_limits
          WHERE rule_pattern IS NOT NULL AND strpos(LOWER(CONCAT_WS('/', l1, l2)), 'out/pri') > 0
          ORDER BY COALESCE(num_waiters, 0) DESC, (concurrency_limit IS NULL) ASC, COALESCE(CAST(usage AS DOUBLE) / concurrency_limit, 0) DESC, COALESCE(rule_pattern, '') ASC, scope ASC, COALESCE(l1, '') ASC, COALESCE(l2, '') ASC
          LIMIT 1001",
      ]
    `);
  });

  it('rejects unsupported structured filters', async () => {
    const query = vi.fn();
    const context = { query } as unknown as QueryContext;

    const response = await listUserLimits.call(context, {
      filters: [
        {
          field: 'l1',
          type: 'STRING',
          operation: 'CONTAINS',
          value: 'checkout',
        },
      ],
    } as never);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe(
      'Unsupported filter for l1: unsupported STRING operation CONTAINS',
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('reports when the bounded result has more counters', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [counter, { ...counter, l1: 'payments' }],
    });
    const context = { query } as unknown as QueryContext;

    const response = await listUserLimits.call(context, { limit: 1 });
    const body = await response.json();

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT scope, l1, l2, level, usage, concurrency_limit, rule_pattern, available, num_waiters
          FROM sys_user_limits
          WHERE rule_pattern IS NOT NULL
          ORDER BY COALESCE(num_waiters, 0) DESC, (concurrency_limit IS NULL) ASC, COALESCE(CAST(usage AS DOUBLE) / concurrency_limit, 0) DESC, COALESCE(rule_pattern, '') ASC, scope ASC, COALESCE(l1, '') ASC, COALESCE(l2, '') ASC
          LIMIT 2",
      ]
    `);
    expect(body.limits).toEqual([counter]);
    expect(body.hasMore).toBe(true);
  });

  it('bounds counters for one rule', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const context = { query } as unknown as QueryContext;

    const response = await listLimitCountersForRule.call(context, 'tenant/*', {
      limit: 1,
    });

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT scope, l1, l2, level, usage, concurrency_limit, rule_pattern, available, num_waiters
          FROM sys_user_limits
          WHERE rule_pattern = 'tenant/*'
          ORDER BY COALESCE(num_waiters, 0) DESC, (concurrency_limit IS NULL) ASC, COALESCE(CAST(usage AS DOUBLE) / concurrency_limit, 0) DESC, COALESCE(rule_pattern, '') ASC, scope ASC, COALESCE(l1, '') ASC, COALESCE(l2, '') ASC
          LIMIT 2",
      ]
    `);
    expect(await response.json()).toEqual({ limits: [], hasMore: false });
  });
});
