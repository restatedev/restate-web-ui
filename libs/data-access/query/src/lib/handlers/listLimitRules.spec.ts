import { describe, expect, it, vi } from 'vitest';
import { getLimitRule, listLimitRules } from './listLimitRules';
import type { QueryContext } from './shared';

const RULES_QUERY = `SELECT pattern,
  concurrency,
  description,
  disabled,
  version
    FROM sys_rules
    ORDER BY pattern ASC`;

const COUNTERS_QUERY = `SELECT rule_pattern,
      COUNT(*) AS num_counters,
      SUM(CASE WHEN num_waiters > 0 THEN 1 ELSE 0 END) AS num_counters_with_waiters
    FROM sys_user_limits
    WHERE rule_pattern IS NOT NULL
    GROUP BY rule_pattern`;

describe('listLimitRules', () => {
  it('requests rules and counter summaries in parallel', async () => {
    let resolveRules: (value: { rows: never[] }) => void = () => undefined;
    let resolveCounters: (value: { rows: never[] }) => void = () => undefined;
    const rulesResult = new Promise<{ rows: never[] }>((resolve) => {
      resolveRules = resolve;
    });
    const countersResult = new Promise<{ rows: never[] }>((resolve) => {
      resolveCounters = resolve;
    });
    const query = vi
      .fn()
      .mockReturnValueOnce(rulesResult)
      .mockReturnValueOnce(countersResult);
    const context = { query } as unknown as QueryContext;

    const responsePromise = listLimitRules.call(context);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenNthCalledWith(1, RULES_QUERY);
    expect(query).toHaveBeenNthCalledWith(2, COUNTERS_QUERY);

    resolveRules({ rows: [] });
    resolveCounters({ rows: [] });

    const response = await responsePromise;
    expect(await response.json()).toEqual({ rules: [] });
  });

  it('returns the concrete counter summary with each rule', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql === RULES_QUERY) {
        return {
          rows: [
            {
              pattern: 'checkout/*',
              concurrency: 25,
              description: 'Checkout services',
              disabled: false,
              version: 2,
            },
          ],
        };
      }
      return {
        rows: [
          {
            rule_pattern: 'checkout/*',
            num_counters: 12,
            num_counters_with_waiters: 3,
          },
        ],
      };
    });
    const context = { query } as unknown as QueryContext;

    const response = await listLimitRules.call(context);

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
    });
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

    expect(query).toHaveBeenCalledWith(`SELECT pattern,
  concurrency,
  description,
  disabled,
  version,
  last_modified
    FROM sys_rules
    WHERE pattern = 'checkout'
    LIMIT 1`);
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
