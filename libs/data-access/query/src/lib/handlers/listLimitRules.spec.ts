import { describe, expect, it, vi } from 'vitest';
import { getLimitRule, listLimitRules } from './listLimitRules';
import type { QueryContext } from './shared';

function querySql(query: ReturnType<typeof vi.fn>) {
  return query.mock.calls.map(([sql]) => sql);
}

describe('listLimitRules', () => {
  it('bounds the rule page and skips statistics for an empty page', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const context = { query } as unknown as QueryContext;

    const response = await listLimitRules.call(context);

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT pattern,
        concurrency,
        description,
        disabled,
        version
          FROM sys_rules
          ORDER BY pattern ASC
          LIMIT 1001",
      ]
    `);
    expect(await response.json()).toEqual({ rules: [], hasMore: false });
  });

  it('sorts rules by pattern', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const context = { query } as unknown as QueryContext;

    await listLimitRules.call(context, {
      sort: { field: 'pattern', order: 'DESC' },
    });

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT pattern,
        concurrency,
        description,
        disabled,
        version
          FROM sys_rules
          ORDER BY pattern DESC
          LIMIT 1001",
      ]
    `);
  });

  it('aggregates statistics only for patterns in the bounded page', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            pattern: 'checkout/*',
            concurrency: 25,
            description: 'Checkout services',
            disabled: false,
            version: 2,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            rule_pattern: 'checkout/*',
            num_counters: 12,
            num_counters_with_waiters: 3,
          },
        ],
      });
    const context = { query } as unknown as QueryContext;

    const response = await listLimitRules.call(context);
    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT pattern,
        concurrency,
        description,
        disabled,
        version
          FROM sys_rules
          ORDER BY pattern ASC
          LIMIT 1001",
        "SELECT rule_pattern,
            COUNT(*) AS num_counters,
            SUM(CASE WHEN num_waiters > 0 THEN 1 ELSE 0 END) AS num_counters_with_waiters
          FROM sys_user_limits
          WHERE rule_pattern IN ('checkout/*')
          GROUP BY rule_pattern",
      ]
    `);
    expect(await response.json()).toEqual({
      rules: [
        {
          pattern: 'checkout/*',
          description: 'Checkout services',
          disabled: false,
          version: 2,
          num_counters: 12,
          num_counters_with_waiters: 3,
          limits: { concurrency: 25 },
        },
      ],
      hasMore: false,
    });
  });

  it('reports when the bounded result has more rules', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            pattern: 'alpha',
            concurrency: 1,
            description: null,
            disabled: false,
            version: 1,
          },
          {
            pattern: 'bravo',
            concurrency: 2,
            description: null,
            disabled: false,
            version: 1,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const context = { query } as unknown as QueryContext;

    const response = await listLimitRules.call(context, { limit: 1 });
    const body = await response.json();

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT pattern,
        concurrency,
        description,
        disabled,
        version
          FROM sys_rules
          ORDER BY pattern ASC
          LIMIT 2",
        "SELECT rule_pattern,
            COUNT(*) AS num_counters,
            SUM(CASE WHEN num_waiters > 0 THEN 1 ELSE 0 END) AS num_counters_with_waiters
          FROM sys_user_limits
          WHERE rule_pattern IN ('alpha')
          GROUP BY rule_pattern",
      ]
    `);
    expect(body.rules).toHaveLength(1);
    expect(body.hasMore).toBe(true);
  });

  it('defaults missing counter summaries to zero', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            pattern: 'checkout',
            concurrency: 10,
            description: null,
            disabled: false,
            version: 1,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const context = { query } as unknown as QueryContext;

    const response = await listLimitRules.call(context);

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT pattern,
        concurrency,
        description,
        disabled,
        version
          FROM sys_rules
          ORDER BY pattern ASC
          LIMIT 1001",
        "SELECT rule_pattern,
            COUNT(*) AS num_counters,
            SUM(CASE WHEN num_waiters > 0 THEN 1 ELSE 0 END) AS num_counters_with_waiters
          FROM sys_user_limits
          WHERE rule_pattern IN ('checkout')
          GROUP BY rule_pattern",
      ]
    `);
    expect(await response.json()).toEqual({
      rules: [
        {
          pattern: 'checkout',
          description: null,
          disabled: false,
          version: 1,
          num_counters: 0,
          num_counters_with_waiters: 0,
          limits: { concurrency: 10 },
        },
      ],
      hasMore: false,
    });
  });

  it('converts a rule timestamp to epoch milliseconds', async () => {
    const query = vi.fn(async () => ({
      rows: [
        {
          pattern: 'checkout',
          concurrency: 10,
          description: null,
          disabled: false,
          version: 1,
          last_modified: '2026-08-07T14:36:46.553Z',
        },
      ],
    }));
    const context = { query } as unknown as QueryContext;

    const response = await getLimitRule.call(context, 'checkout');

    expect(querySql(query)).toMatchInlineSnapshot(`
      [
        "SELECT pattern,
        concurrency,
        description,
        disabled,
        version,
        last_modified
          FROM sys_rules
          WHERE pattern = 'checkout'",
      ]
    `);
    expect(await response.json()).toEqual({
      pattern: 'checkout',
      description: null,
      disabled: false,
      version: 1,
      last_modified_millis_since_epoch: Date.parse('2026-08-07T14:36:46.553Z'),
      limits: { concurrency: 10 },
    });
  });
});
