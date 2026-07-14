import { describe, expect, it } from 'vitest';
import {
  NO_VQUEUE_HEADERS,
  VQUEUE_SKIP_COMPLETED_HEADERS,
  createInvocationV2QueryTestHarness,
} from './testUtils';

describe('POST /query/v2/invocations/finished-history', () => {
  const { sql, post, setResponder } = createInvocationV2QueryTestHarness();

  describe('VQueue exact', () => {
    it('returns exact four-outcome buckets and fills missing buckets', async () => {
      setResponder(() => [
        {
          bucket: Date.parse('2026-01-01T00:00:00.000Z') / 1000,
          succeeded: 3,
          failed: 2,
          cancelled: 1,
          killed: 4,
        },
        {
          bucket: Date.parse('2026-01-01T00:02:00.000Z') / 1000,
          succeeded: 5,
          failed: 0,
          cancelled: 0,
          killed: 0,
        },
      ]);

      const response = await post('/v2/invocations/finished-history', {
        startTime: '2026-01-01T00:00:00.000Z',
        endTime: '2026-01-01T00:03:00.000Z',
        interval: 'PT1M',
      });
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
          [
            "SELECT
                  to_unixtime(
                    date_bin(
                      INTERVAL '60 seconds',
                      transitioned_at,
                      TIMESTAMP '1970-01-01T00:00:00'
                    )
                  ) AS bucket,
                  COUNT(1) FILTER (WHERE status = 'succeeded') AS succeeded,
                  COUNT(1) FILTER (WHERE status = 'failed') AS failed,
                  COUNT(1) FILTER (WHERE status = 'cancelled') AS cancelled,
                  COUNT(1) FILTER (WHERE status = 'killed') AS killed
                FROM sys_vqueues
                WHERE stage = 'finished'
                  AND entry_kind = 'invocation'
                  AND transitioned_at >= '2026-01-01T00:00:00.000Z'
                  AND transitioned_at < '2026-01-01T00:03:00.000Z'
                GROUP BY bucket",
          ]
        `);
      expect(body.granularity).toBe('exact');
      expect(body.buckets).toEqual([
        {
          start: '2026-01-01T00:00:00.000Z',
          end: '2026-01-01T00:01:00.000Z',
          succeeded: 3,
          failed: 2,
          cancelled: 1,
          killed: 4,
        },
        {
          start: '2026-01-01T00:01:00.000Z',
          end: '2026-01-01T00:02:00.000Z',
          succeeded: 0,
          failed: 0,
          cancelled: 0,
          killed: 0,
        },
        {
          start: '2026-01-01T00:02:00.000Z',
          end: '2026-01-01T00:03:00.000Z',
          succeeded: 5,
          failed: 0,
          cancelled: 0,
          killed: 0,
        },
      ]);
    });
  });

  describe('without VQueue exact', () => {
    it('uses invocation status when completed rows were skipped by VQueue migration', async () => {
      await post(
        '/v2/invocations/finished-history',
        {
          startTime: '2026-01-01T00:00:00.000Z',
          endTime: '2026-01-01T01:00:00.000Z',
          interval: 'PT1H',
        },
        VQUEUE_SKIP_COMPLETED_HEADERS,
      );

      expect(sql).toMatchInlineSnapshot(`
          [
            "SELECT
                  to_unixtime(
                    date_bin(
                      INTERVAL '3600 seconds',
                      completed_at,
                      TIMESTAMP '1970-01-01T00:00:00'
                    )
                  ) AS bucket,
                  COUNT(1) FILTER (WHERE completion_result = 'success') AS succeeded,
                  COUNT(1) FILTER (WHERE completion_result = 'failure') AS failed
                FROM sys_invocation_status
                WHERE status = 'completed'
                  AND completed_at >= '2026-01-01T00:00:00.000Z'
                  AND completed_at < '2026-01-01T01:00:00.000Z'
                GROUP BY bucket",
          ]
        `);
    });

    it('groups every invocation-status non-success outcome into failed', async () => {
      setResponder(() => [
        {
          bucket: Date.parse('2026-01-01T00:00:00.000Z') / 1000,
          succeeded: 7,
          failed: 3,
        },
      ]);

      const response = await post(
        '/v2/invocations/finished-history',
        {
          startTime: '2026-01-01T00:00:00.000Z',
          endTime: '2026-01-01T01:00:00.000Z',
          interval: 'PT1H',
        },
        NO_VQUEUE_HEADERS,
      );
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
          [
            "SELECT
                  to_unixtime(
                    date_bin(
                      INTERVAL '3600 seconds',
                      completed_at,
                      TIMESTAMP '1970-01-01T00:00:00'
                    )
                  ) AS bucket,
                  COUNT(1) FILTER (WHERE completion_result = 'success') AS succeeded,
                  COUNT(1) FILTER (WHERE completion_result = 'failure') AS failed
                FROM sys_invocation_status
                WHERE status = 'completed'
                  AND completed_at >= '2026-01-01T00:00:00.000Z'
                  AND completed_at < '2026-01-01T01:00:00.000Z'
                GROUP BY bucket",
          ]
        `);
      expect(body.granularity).toBe('failure-grouped');
      expect(body.buckets[0]).toMatchObject({
        succeeded: 7,
        failed: 3,
        cancelled: 0,
        killed: 0,
      });
    });
  });

  describe('validation', () => {
    it.each(['PT0S', '-PT1H'])(
      'rejects a non-positive interval: %s',
      async (interval) => {
        const response = await post('/v2/invocations/finished-history', {
          startTime: '2026-01-01T00:00:00.000Z',
          endTime: '2026-01-01T03:00:00.000Z',
          interval,
        });

        expect(response.status).toBe(400);
        expect(JSON.stringify(await response.json())).toContain(
          'interval must be a positive duration',
        );
        expect(sql).toEqual([]);
      },
    );

    it('rejects a history response larger than 10000 buckets', async () => {
      const response = await post('/v2/invocations/finished-history', {
        startTime: '2026-01-01T00:00:00.000Z',
        endTime: '2026-01-01T03:00:00.000Z',
        interval: 'PT1S',
      });

      expect(response.status).toBe(400);
      expect(JSON.stringify(await response.json())).toContain(
        'at most 10000 buckets',
      );
      expect(sql).toMatchInlineSnapshot(`[]`);
    });
  });
});
