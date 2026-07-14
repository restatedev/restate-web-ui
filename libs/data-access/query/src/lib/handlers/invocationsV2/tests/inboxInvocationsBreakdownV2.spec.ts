import { describe, expect, it, vi } from 'vitest';
import {
  NO_VQUEUE_HEADERS,
  VQUEUE_HEADERS,
  VQUEUE_SKIP_COMPLETED_HEADERS,
  createInvocationV2QueryTestHarness,
} from './testUtils';

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
                AND v.stage = 'inbox'
                AND v.entry_kind = 'invocation'",
        ]
      `);
      expect(body).toMatchObject({
        total: 3,
        due: 1,
        notDue: 2,
        isPartial: true,
        partial: { reason: 'vqueue-limit', queueLimit: 100000 },
      });
      expect(body).not.toHaveProperty('byService');
    });

    it('rejects due grouping for selected services', async () => {
      const response = await post('/v2/invocations/inbox', {
        groupBy: 'due',
        serviceNames: ['Greeter', 'Payments'],
        groupByService: true,
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: 'groupByService is not supported when VQueues are enabled',
      });
      expect(sql).toEqual([]);
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
                WHERE v.stage = 'inbox'
                  AND v.entry_kind = 'invocation'",
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
                AND v.entry_kind = 'invocation'
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

    it('rejects status grouping for a selected service', async () => {
      const response = await post('/v2/invocations/inbox', {
        groupBy: 'status',
        serviceNames: ['Greeter'],
        groupByService: true,
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: 'groupByService is not supported when VQueues are enabled',
      });
      expect(sql).toEqual([]);
    });

    it.each(['due', 'status'] as const)(
      'rejects a %s breakdown grouped across every service',
      async (groupBy) => {
        const response = await post('/v2/invocations/inbox', {
          groupBy,
          groupByService: true,
        });

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
          message: 'groupByService is not supported when VQueues are enabled',
        });
        expect(sql).toEqual([]);
      },
    );

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
                  AND v.entry_kind = 'invocation'
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

    it('stays on VQueues when only completed rows were skipped by migration', async () => {
      await post(
        '/v2/invocations/inbox',
        { groupBy: 'status' },
        VQUEUE_SKIP_COMPLETED_HEADERS,
      );

      expect(sql).toMatchInlineSnapshot(`
          [
            "SELECT
                  v.status,
                  COUNT(1) AS count
                FROM sys_vqueues v
                WHERE v.stage = 'inbox'
                  AND v.entry_kind = 'invocation'
                GROUP BY v.status",
          ]
        `);
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
                    AND v.entry_kind = 'invocation'
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

  describe('without VQueue exact', () => {
    it('applies a service filter while joining only the running-state query', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_invocation_state sis')
          ? [{ running: 1 }]
          : [{ inboxed: 2, scheduled: 3, invoked: 4 }],
      );

      const response = await post(
        '/v2/invocations/inbox',
        { groupBy: 'due', serviceNames: ["Pay'ments"] },
        NO_VQUEUE_HEADERS,
      );
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
          [
            "SELECT
                    SUM(CASE WHEN status = 'inboxed' THEN 1 ELSE 0 END) AS inboxed,
                    SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled,
                    SUM(CASE WHEN status = 'invoked' THEN 1 ELSE 0 END) AS invoked
                  FROM sys_invocation_status
                  WHERE status IN ('inboxed', 'scheduled', 'invoked')
                    AND target_service_name IN ('Pay''ments')",
            "SELECT
                    COUNT(1) AS running
                  FROM sys_invocation_state sis
                  JOIN sys_invocation_status ss ON ss.id = sis.id
                  WHERE sis.in_flight
                    AND ss.status = 'invoked'
                    AND ss.target_service_name IN ('Pay''ments')",
          ]
        `);
      expect(body).toMatchObject({ total: 8, due: 5, notDue: 3 });
      expect(body).not.toHaveProperty('byService');
    });

    it('groups both parallel aggregates by service when requested', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_invocation_state sis')
          ? [{ service_name: 'Greeter', running: 2 }]
          : [
              {
                service_name: 'Greeter',
                inboxed: 1,
                scheduled: 2,
                invoked: 5,
              },
            ],
      );

      const response = await post(
        '/v2/invocations/inbox',
        { groupBy: 'due', groupByService: true },
        NO_VQUEUE_HEADERS,
      );
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                  target_service_name AS service_name,
                  SUM(CASE WHEN status = 'inboxed' THEN 1 ELSE 0 END) AS inboxed,
                  SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled,
                  SUM(CASE WHEN status = 'invoked' THEN 1 ELSE 0 END) AS invoked
                FROM sys_invocation_status
                WHERE status IN ('inboxed', 'scheduled', 'invoked')
                GROUP BY target_service_name",
          "SELECT
                  ss.target_service_name AS service_name,
                  COUNT(1) AS running
                FROM sys_invocation_state sis
                JOIN sys_invocation_status ss ON ss.id = sis.id
                WHERE sis.in_flight
                  AND ss.status = 'invoked'
                GROUP BY ss.target_service_name",
        ]
      `);
      expect(body.byService).toEqual([
        { service: 'Greeter', total: 6, due: 4, notDue: 2 },
      ]);
    });

    it('runs status and running-state aggregates in parallel without a join', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_invocation_state')
          ? [{ running: 2 }]
          : [{ inboxed: 3, scheduled: 4, invoked: 5 }],
      );

      const response = await post(
        '/v2/invocations/inbox',
        { groupBy: 'due' },
        NO_VQUEUE_HEADERS,
      );
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
          [
            "SELECT
                    SUM(CASE WHEN status = 'inboxed' THEN 1 ELSE 0 END) AS inboxed,
                    SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled,
                    SUM(CASE WHEN status = 'invoked' THEN 1 ELSE 0 END) AS invoked
                  FROM sys_invocation_status
                  WHERE status IN ('inboxed', 'scheduled', 'invoked')",
            "SELECT COUNT(1) AS running
                  FROM sys_invocation_state
                  WHERE in_flight",
          ]
        `);
      expect(body).toMatchObject({ total: 10, due: 6, notDue: 4 });
      expect(body).not.toHaveProperty('byStatus');
    });

    it('clamps a racing running count to the raw invoked population', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_invocation_state')
          ? [{ running: 5 }]
          : [{ inboxed: 1, scheduled: 2, invoked: 3 }],
      );

      const response = await post(
        '/v2/invocations/inbox',
        { groupBy: 'due' },
        NO_VQUEUE_HEADERS,
      );

      expect(await response.json()).toMatchObject({
        total: 3,
        due: 1,
        notDue: 2,
      });
    });

    it('uses invocation status and state when VQueues are advertised before 1.7.2', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_invocation_state')
          ? [{ running: 0 }]
          : [{ inboxed: 1, scheduled: 0, invoked: 0 }],
      );

      await post(
        '/v2/invocations/inbox',
        { groupBy: 'due' },
        { ...VQUEUE_HEADERS, 'x-restate-version': '1.7.1' },
      );

      expect(sql).toMatchInlineSnapshot(`
          [
            "SELECT
                    SUM(CASE WHEN status = 'inboxed' THEN 1 ELSE 0 END) AS inboxed,
                    SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled,
                    SUM(CASE WHEN status = 'invoked' THEN 1 ELSE 0 END) AS invoked
                  FROM sys_invocation_status
                  WHERE status IN ('inboxed', 'scheduled', 'invoked')",
            "SELECT COUNT(1) AS running
                  FROM sys_invocation_state
                  WHERE in_flight",
          ]
        `);
    });

    it('applies a service filter while joining only the state aggregate', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_invocation_state sis')
          ? [{ running: 1, backing_off: 2 }]
          : [{ inboxed: 2, scheduled: 3, invoked: 5 }],
      );

      const response = await post(
        '/v2/invocations/inbox',
        { groupBy: 'status', serviceNames: ["Pay'ments"] },
        NO_VQUEUE_HEADERS,
      );
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
          [
            "SELECT
                    SUM(CASE WHEN status = 'inboxed' THEN 1 ELSE 0 END) AS inboxed,
                    SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled,
                    SUM(CASE WHEN status = 'invoked' THEN 1 ELSE 0 END) AS invoked
                  FROM sys_invocation_status
                  WHERE status IN ('inboxed', 'scheduled', 'invoked')
                    AND target_service_name IN ('Pay''ments')",
            "SELECT
                    SUM(CASE WHEN sis.in_flight THEN 1 ELSE 0 END) AS running,
                    SUM(
                      CASE
                        WHEN sis.in_flight IS NOT TRUE AND sis.retry_count > 0 THEN 1
                        ELSE 0
                      END
                    ) AS backing_off
                  FROM sys_invocation_state sis
                  JOIN sys_invocation_status ss ON ss.id = sis.id
                  WHERE ss.status = 'invoked'
                    AND ss.target_service_name IN ('Pay''ments')",
          ]
        `);
      expect(body).toEqual({
        groupBy: 'status',
        total: 9,
        byStatus: [
          { status: 'pending', count: 2 },
          { status: 'scheduled', count: 3 },
          { status: 'backing-off', count: 2 },
          { status: 'ready', count: 2 },
        ],
        isPartial: false,
      });
    });

    it('groups both parallel aggregates by service when requested', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_invocation_state sis')
          ? [{ service_name: 'Greeter', running: 1, backing_off: 2 }]
          : [
              {
                service_name: 'Greeter',
                inboxed: 2,
                scheduled: 1,
                invoked: 5,
              },
            ],
      );

      const response = await post(
        '/v2/invocations/inbox',
        { groupBy: 'status', groupByService: true },
        NO_VQUEUE_HEADERS,
      );
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                  target_service_name AS service_name,
                  SUM(CASE WHEN status = 'inboxed' THEN 1 ELSE 0 END) AS inboxed,
                  SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled,
                  SUM(CASE WHEN status = 'invoked' THEN 1 ELSE 0 END) AS invoked
                FROM sys_invocation_status
                WHERE status IN ('inboxed', 'scheduled', 'invoked')
                GROUP BY target_service_name",
          "SELECT
                  ss.target_service_name AS service_name,
                  SUM(CASE WHEN sis.in_flight THEN 1 ELSE 0 END) AS running,
                  SUM(
                    CASE
                      WHEN sis.in_flight IS NOT TRUE AND sis.retry_count > 0 THEN 1
                      ELSE 0
                    END
                  ) AS backing_off
                FROM sys_invocation_state sis
                JOIN sys_invocation_status ss ON ss.id = sis.id
                WHERE ss.status = 'invoked'
                GROUP BY ss.target_service_name",
        ]
      `);
      expect(body.byService).toEqual([{ service: 'Greeter', count: 7 }]);
      expect(body.byServiceAndStatus).toEqual([
        { service: 'Greeter', status: 'pending', count: 2 },
        { service: 'Greeter', status: 'scheduled', count: 1 },
        { service: 'Greeter', status: 'backing-off', count: 2 },
        { service: 'Greeter', status: 'ready', count: 2 },
      ]);
    });

    it('derives pending, scheduled, backing-off, and ready from two parallel aggregates', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_invocation_state')
          ? [{ running: 3, backing_off: 2 }]
          : [{ inboxed: 2, scheduled: 4, invoked: 10 }],
      );

      const response = await post(
        '/v2/invocations/inbox',
        { groupBy: 'status' },
        NO_VQUEUE_HEADERS,
      );
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
          [
            "SELECT
                    SUM(CASE WHEN status = 'inboxed' THEN 1 ELSE 0 END) AS inboxed,
                    SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled,
                    SUM(CASE WHEN status = 'invoked' THEN 1 ELSE 0 END) AS invoked
                  FROM sys_invocation_status
                  WHERE status IN ('inboxed', 'scheduled', 'invoked')",
            "SELECT
                    SUM(CASE WHEN in_flight THEN 1 ELSE 0 END) AS running,
                    SUM(
                      CASE
                        WHEN in_flight IS NOT TRUE AND retry_count > 0 THEN 1
                        ELSE 0
                      END
                    ) AS backing_off
                  FROM sys_invocation_state",
          ]
        `);
      expect(body).toEqual({
        groupBy: 'status',
        total: 13,
        byStatus: [
          { status: 'pending', count: 2 },
          { status: 'scheduled', count: 4 },
          { status: 'backing-off', count: 2 },
          { status: 'ready', count: 5 },
        ],
        isPartial: false,
      });
      expect(body).not.toHaveProperty('due');
    });

    it('clamps racing state counts before deriving ready', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_invocation_state')
          ? [{ running: 4, backing_off: 4 }]
          : [{ inboxed: 0, scheduled: 0, invoked: 5 }],
      );

      const response = await post(
        '/v2/invocations/inbox',
        { groupBy: 'status' },
        NO_VQUEUE_HEADERS,
      );
      const body = await response.json();

      expect(body.byStatus).toEqual([
        { status: 'pending', count: 0 },
        { status: 'scheduled', count: 0 },
        { status: 'backing-off', count: 1 },
        { status: 'ready', count: 0 },
      ]);
    });

    it('uses invocation status and state when VQueues are advertised before 1.7.2', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_invocation_state')
          ? [{ running: 0, backing_off: 0 }]
          : [{ inboxed: 1, scheduled: 0, invoked: 0 }],
      );

      await post(
        '/v2/invocations/inbox',
        { groupBy: 'status' },
        { ...VQUEUE_HEADERS, 'x-restate-version': '1.7.1' },
      );

      expect(sql).toMatchInlineSnapshot(`
          [
            "SELECT
                    SUM(CASE WHEN status = 'inboxed' THEN 1 ELSE 0 END) AS inboxed,
                    SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled,
                    SUM(CASE WHEN status = 'invoked' THEN 1 ELSE 0 END) AS invoked
                  FROM sys_invocation_status
                  WHERE status IN ('inboxed', 'scheduled', 'invoked')",
            "SELECT
                    SUM(CASE WHEN in_flight THEN 1 ELSE 0 END) AS running,
                    SUM(
                      CASE
                        WHEN in_flight IS NOT TRUE AND retry_count > 0 THEN 1
                        ELSE 0
                      END
                    ) AS backing_off
                  FROM sys_invocation_state",
          ]
        `);
    });
  });
});
