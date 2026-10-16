import { describe, expect, it, vi } from 'vitest';
import { createInvocationV2QueryTestHarness } from './testUtils';

describe('POST /query/v2/invocations/inbox', () => {
  const { sql, post, setResponder } = createInvocationV2QueryTestHarness();

  describe('VQueue exact', () => {
    it('returns a bounded service-filtered due breakdown as partial without a sentinel', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
      setResponder(() => [{ total: 3, due: 1, not_due: 2 }]);

      const response = await post('/v2/invocations/inbox', {
        groupBy: 'due',
        serviceNames: ["Pay'ments"],
      });
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                COUNT(1) AS total,
                SUM(
                  CASE
                    WHEN v.first_runnable_at <= '2026-01-02T00:00:00.000Z' THEN 1
                    ELSE 0
                  END
                ) AS due,
                SUM(
                  CASE
                    WHEN v.first_runnable_at <= '2026-01-02T00:00:00.000Z' THEN 0
                    ELSE 1
                  END
                ) AS not_due
              FROM sys_vqueues v
              WHERE v.id IN (
                SELECT vm.id
                FROM sys_vqueue_meta vm
                WHERE vm.service_name IN ('Pay''ments')
                  AND vm.num_inbox > 0
                LIMIT 100000
              )
                AND v.stage = 'inbox'",
        ]
      `);
      expect(body).toMatchObject({
        total: 3,
        due: 1,
        notDue: 2,
        isPartial: true,
        partial: { reason: 'vqueue-limit', queueLimit: 100000 },
      });
    });

    it('calculates only the exact overall due split without a join or status grouping', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
      setResponder(() => [{ total: 5, due: 3, not_due: 2 }]);

      const response = await post('/v2/invocations/inbox', { groupBy: 'due' });
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                COUNT(1) AS total,
                SUM(
                  CASE
                    WHEN v.first_runnable_at <= '2026-01-02T00:00:00.000Z' THEN 1
                    ELSE 0
                  END
                ) AS due,
                SUM(
                  CASE
                    WHEN v.first_runnable_at <= '2026-01-02T00:00:00.000Z' THEN 0
                    ELSE 1
                  END
                ) AS not_due
              FROM sys_vqueues v
              WHERE v.stage = 'inbox'",
        ]
      `);
      expect(body).toEqual({
        groupBy: 'due',
        asOf: '2026-01-02T00:00:00.000Z',
        total: 5,
        due: 3,
        notDue: 2,
        isPartial: false,
      });
      expect(body).not.toHaveProperty('byStatus');
    });

    it('returns bounded service-filtered statuses as partial without a sentinel', async () => {
      setResponder(() => [
        { status: 'scheduled', count: 3 },
        { status: 'yielded', count: 2 },
      ]);

      const response = await post('/v2/invocations/inbox', {
        groupBy: 'status',
        serviceNames: ["Pay'ments"],
      });
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                v.status,
                COUNT(1) AS count
              FROM sys_vqueues v
              WHERE v.id IN (
                SELECT vm.id
                FROM sys_vqueue_meta vm
                WHERE vm.service_name IN ('Pay''ments')
                  AND vm.num_inbox > 0
                LIMIT 100000
              )
                AND v.stage = 'inbox'
              GROUP BY v.status",
        ]
      `);
      expect(body).toEqual({
        groupBy: 'status',
        total: 5,
        byStatus: [
          { status: 'scheduled', count: 3 },
          { status: 'yielded', count: 2 },
        ],
        isPartial: true,
        partial: { reason: 'vqueue-limit', queueLimit: 100000 },
      });
    });

    it('groups only by raw VQueue status without calculating due state', async () => {
      setResponder(() => [
        { status: 'new', count: 2 },
        { status: 'yielded', count: 3 },
      ]);

      const response = await post('/v2/invocations/inbox', {
        groupBy: 'status',
      });
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                v.status,
                COUNT(1) AS count
              FROM sys_vqueues v
              WHERE v.stage = 'inbox'
              GROUP BY v.status",
        ]
      `);
      expect(body).toEqual({
        groupBy: 'status',
        total: 5,
        byStatus: [
          { status: 'pending', count: 2 },
          { status: 'yielded', count: 3 },
        ],
        isPartial: false,
      });
      expect(body).not.toHaveProperty('due');
      expect(body).not.toHaveProperty('notDue');
      expect(body).not.toHaveProperty('asOf');
    });
  });

  describe('VQueue sampled', () => {
    it('bounds the overall status scan and reports a saturated sample as partial', async () => {
      setResponder(() => [
        { status: 'new', count: 30_000 },
        { status: 'backing-off', count: 20_000 },
      ]);

      const response = await post('/v2/invocations/inbox', {
        groupBy: 'status',
        mode: { type: 'sampled', sampleSize: 50_000 },
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                  sampled_inbox.status,
                  COUNT(1) AS count
                FROM (
                  SELECT
                    v.status
                  FROM sys_vqueues v
                  WHERE v.stage = 'inbox'
                  LIMIT 50000
                ) sampled_inbox
                GROUP BY sampled_inbox.status",
        ]
      `);
      expect(await response.json()).toEqual({
        groupBy: 'status',
        total: 50_000,
        byStatus: [
          { status: 'pending', count: 30_000 },
          { status: 'backing-off', count: 20_000 },
        ],
        isPartial: true,
      });
    });

    it('reports a sample below the requested limit as complete', async () => {
      setResponder(() => [{ status: 'new', count: 12 }]);

      const response = await post('/v2/invocations/inbox', {
        groupBy: 'status',
        mode: { type: 'sampled', sampleSize: 50_000 },
      });

      expect(await response.json()).toMatchObject({
        total: 12,
        isPartial: false,
      });
    });
  });
});
