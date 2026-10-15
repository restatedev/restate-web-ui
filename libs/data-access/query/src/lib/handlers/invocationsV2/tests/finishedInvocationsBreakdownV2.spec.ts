import { describe, expect, it } from 'vitest';
import { createInvocationV2QueryTestHarness } from './testUtils';

describe('POST /query/v2/invocations/finished-breakdown', () => {
  const { sql, post, setResponder } = createInvocationV2QueryTestHarness();

  describe('VQueue exact', () => {
    it('uses one finished-keyspace query', async () => {
      setResponder(() => [
        { status: 'killed', count: 2 },
        { status: 'future-terminal-status', count: 1 },
      ]);

      const response = await post('/v2/invocations/finished-breakdown', {
        mode: { type: 'exact' },
        startTime: '2026-01-01T00:00:00.000Z',
        endTime: '2026-02-01T00:00:00.000Z',
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                status,
                COUNT(1) AS count
              FROM sys_vqueues
              WHERE stage = 'finished'
                AND transitioned_at >= '2026-01-01T00:00:00.000Z'
                AND transitioned_at < '2026-02-01T00:00:00.000Z'
              GROUP BY status",
        ]
      `);
      expect(await response.json()).toMatchObject({
        mode: 'exact',
        granularity: 'exact',
        isPartial: false,
        scannedCount: 3,
      });
    });
  });

  describe('VQueue sampled', () => {
    it('accepts a one-million-row sample', async () => {
      await post('/v2/invocations/finished-breakdown', {
        mode: { type: 'sampled', sampleSize: 1_000_000 },
        startTime: '2026-01-01T00:00:00.000Z',
        endTime: '2026-02-01T00:00:00.000Z',
      });

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                sampled_finished.status,
                COUNT(1) AS count
              FROM (
                SELECT status
                FROM sys_vqueues
                WHERE stage = 'finished'
                  AND transitioned_at >= '2026-01-01T00:00:00.000Z'
                  AND transitioned_at < '2026-02-01T00:00:00.000Z'
                LIMIT 1000000
              ) sampled_finished
              GROUP BY sampled_finished.status",
        ]
      `);
    });

    it('uses one bounded finished scan and marks a full sample as partial', async () => {
      setResponder(() => [
        { status: 'succeeded', count: 3 },
        { status: 'failed', count: 2 },
      ]);

      const response = await post('/v2/invocations/finished-breakdown', {
        mode: { type: 'sampled', sampleSize: 5 },
        startTime: '2026-01-01T00:00:00.000Z',
        endTime: '2026-02-01T00:00:00.000Z',
      });
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                sampled_finished.status,
                COUNT(1) AS count
              FROM (
                SELECT status
                FROM sys_vqueues
                WHERE stage = 'finished'
                  AND transitioned_at >= '2026-01-01T00:00:00.000Z'
                  AND transitioned_at < '2026-02-01T00:00:00.000Z'
                LIMIT 5
              ) sampled_finished
              GROUP BY sampled_finished.status",
        ]
      `);
      expect(body).toMatchObject({
        mode: 'sampled',
        granularity: 'exact',
        isPartial: true,
        scannedCount: 5,
      });
    });

    it('defaults to a bounded sample', async () => {
      await post('/v2/invocations/finished-breakdown', {});

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                sampled_finished.status,
                COUNT(1) AS count
              FROM (
                SELECT status
                FROM sys_vqueues
                WHERE stage = 'finished'
                LIMIT 50000
              ) sampled_finished
              GROUP BY sampled_finished.status",
        ]
      `);
    });
  });

  describe('validation', () => {
    it('rejects an invalid sampled mode before querying', async () => {
      const response = await post('/v2/invocations/finished-breakdown', {
        mode: { type: 'sampled', sampleSize: 0 },
      });

      expect(response.status).toBe(400);
      expect(sql).toMatchInlineSnapshot(`[]`);
    });

    it('rejects samples above one million before querying', async () => {
      const response = await post('/v2/invocations/finished-breakdown', {
        mode: { type: 'sampled', sampleSize: 1_000_001 },
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        message: 'mode.sampleSize must be at most 1000000',
      });
      expect(sql).toMatchInlineSnapshot(`[]`);
    });
  });
});
