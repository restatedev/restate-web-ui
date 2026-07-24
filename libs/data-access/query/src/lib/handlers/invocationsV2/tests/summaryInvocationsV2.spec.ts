import { describe, expect, it } from 'vitest';
import {
  NO_VQUEUE_HEADERS,
  VQUEUE_SKIP_COMPLETED_HEADERS,
  createInvocationV2QueryTestHarness,
} from './testUtils';

describe('POST /query/v2/invocations/summary', () => {
  const { sql, post, setResponder } = createInvocationV2QueryTestHarness();

  describe('VQueue exact', () => {
    it('returns stage totals without scanning inbox or finished entries', async () => {
      setResponder(() => [
        {
          service_name: 'Greeter',
          inbox: 5,
          running: 2,
          suspended: 1,
          paused: 3,
          finished: 8,
        },
      ]);

      const response = await post('/v2/invocations/summary', {
        mode: { type: 'exact' },
        view: 'stages',
      });
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                vm.service_name,
                SUM(vm.num_inbox) AS inbox,
                SUM(vm.num_running) AS running,
                SUM(vm.num_suspended) AS suspended,
                SUM(vm.num_paused) AS paused,
                SUM(vm.num_finished) AS finished
              FROM sys_vqueue_meta vm
              WHERE vm.num_inbox > 0
                OR vm.num_running > 0
                OR vm.num_suspended > 0
                OR vm.num_paused > 0
                OR vm.num_finished > 0
              GROUP BY vm.service_name",
        ]
      `);
      expect(body.stageBuckets).toEqual([
        expect.objectContaining({
          key: 'inbox',
          count: 5,
          breakdownCoverage: 'missing',
          breakdownCanRefine: true,
        }),
        expect.objectContaining({
          key: 'running',
          count: 2,
          breakdownCoverage: 'full',
          breakdownCanRefine: false,
        }),
        expect.objectContaining({ key: 'suspended', count: 1 }),
        expect.objectContaining({ key: 'paused', count: 3 }),
        expect.objectContaining({
          key: 'finished',
          count: 8,
          breakdownCoverage: 'missing',
          breakdownCanRefine: true,
        }),
      ]);
      expect(body.queryDurationMs).toEqual(expect.any(Number));
    });

    it('applies a service filter directly to VQueue metadata for stage totals', async () => {
      setResponder(() => [
        {
          service_name: 'Checkout',
          inbox: 5,
          running: 2,
          suspended: 1,
          paused: 3,
          finished: 8,
        },
      ]);

      const response = await post('/v2/invocations/summary', {
        filters: [
          {
            type: 'STRING_LIST',
            field: 'target_service_name',
            operation: 'IN',
            value: ['Checkout'],
          },
        ],
        mode: { type: 'exact' },
        view: 'stages',
      });
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                vm.service_name,
                SUM(vm.num_inbox) AS inbox,
                SUM(vm.num_running) AS running,
                SUM(vm.num_suspended) AS suspended,
                SUM(vm.num_paused) AS paused,
                SUM(vm.num_finished) AS finished
              FROM sys_vqueue_meta vm
              WHERE vm.service_name IN ('Checkout')
                AND (
                  vm.num_inbox > 0
                  OR vm.num_running > 0
                  OR vm.num_suspended > 0
                  OR vm.num_paused > 0
                  OR vm.num_finished > 0
                )
              GROUP BY vm.service_name",
        ]
      `);
      expect(body.appliedFilters).toEqual([
        {
          type: 'STRING_LIST',
          field: 'target_service_name',
          operation: 'IN',
          value: ['Checkout'],
        },
      ]);
      expect(body).toMatchObject({
        total: 19,
        isPartial: false,
        stageCountsArePartial: false,
      });
    });

    it('ignores the legacy rolling range for VQueue summaries', async () => {
      setResponder(() => []);

      const response = await post('/v2/invocations/summary', {
        mode: { type: 'exact' },
        range: 'PT1H',
        view: 'stages',
      });
      const body = await response.json();

      expect(sql).toHaveLength(1);
      expect(sql[0]).not.toContain('created_at');
      expect(body.appliedFilters).toEqual([]);
    });

    it('returns only the refinable status distributions for the breakdown view', async () => {
      setResponder((statement) =>
        statement.includes("stage = 'inbox'")
          ? [
              { status: 'new', count: 5 },
              { status: 'backing-off', count: 1 },
            ]
          : [
              { status: 'succeeded', count: 7 },
              { status: 'failed', count: 1 },
            ],
      );

      const response = await post('/v2/invocations/summary', {
        mode: { type: 'exact' },
        view: 'breakdowns',
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
          "SELECT
                v.status,
                COUNT(1) AS count
              FROM sys_vqueues v
              WHERE v.stage = 'finished'
                AND v.entry_kind = 'invocation'
              GROUP BY v.status",
        ]
      `);
      expect(body.stageBuckets).toEqual([
        expect.objectContaining({
          key: 'inbox',
          count: 6,
          breakdownCoverage: 'full',
          breakdownCanRefine: false,
        }),
        expect.objectContaining({ key: 'running', count: 0 }),
        expect.objectContaining({ key: 'suspended', count: 0 }),
        expect.objectContaining({ key: 'paused', count: 0 }),
        expect.objectContaining({
          key: 'finished',
          count: 8,
          breakdownCoverage: 'full',
          breakdownCanRefine: false,
        }),
      ]);
      expect(body.statusBuckets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'pending', count: 5 }),
          expect.objectContaining({ key: 'backing-off', count: 1 }),
          expect.objectContaining({ key: 'succeeded', count: 7 }),
          expect.objectContaining({ key: 'failed', count: 1 }),
        ]),
      );
    });

    it('keeps status and service filters as highlights', async () => {
      setResponder((statement) => {
        if (statement.includes('FROM sys_vqueue_meta')) {
          return [
            {
              service_name: 'Greeter',
              inbox: 5,
              running: 2,
              suspended: 0,
              paused: 0,
              finished: 3,
            },
            {
              service_name: 'Payments',
              inbox: 1,
              running: 0,
              suspended: 0,
              paused: 0,
              finished: 0,
            },
          ];
        }
        if (statement.includes("stage = 'inbox'")) {
          return [
            { status: 'new', count: 5 },
            { status: 'backing-off', count: 1 },
          ];
        }
        return [
          { status: 'succeeded', count: 2 },
          { status: 'failed', count: 1 },
        ];
      });

      const response = await post('/v2/invocations/summary', {
        highlightFields: ['status', 'target_service_name'],
        filters: [
          {
            type: 'STRING_LIST',
            field: 'status',
            operation: 'IN',
            value: ['backing-off'],
          },
          {
            type: 'STRING_LIST',
            field: 'target_service_name',
            operation: 'IN',
            value: ['Greeter'],
          },
        ],
        mode: { type: 'exact' },
      });
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                vm.service_name,
                SUM(vm.num_inbox) AS inbox,
                SUM(vm.num_running) AS running,
                SUM(vm.num_suspended) AS suspended,
                SUM(vm.num_paused) AS paused,
                SUM(vm.num_finished) AS finished
              FROM sys_vqueue_meta vm
              WHERE vm.num_inbox > 0
                OR vm.num_running > 0
                OR vm.num_suspended > 0
                OR vm.num_paused > 0
                OR vm.num_finished > 0
              GROUP BY vm.service_name",
          "SELECT
                v.status,
                COUNT(1) AS count
              FROM sys_vqueues v
              WHERE v.stage = 'inbox'
                AND v.entry_kind = 'invocation'
              GROUP BY v.status",
          "SELECT
                v.status,
                COUNT(1) AS count
              FROM sys_vqueues v
              WHERE v.stage = 'finished'
                AND v.entry_kind = 'invocation'
              GROUP BY v.status",
        ]
      `);
      expect(body.appliedFilters).toEqual([]);
      expect(body.stageCountsArePartial).toBe(false);
      expect(body.stageBuckets).toEqual([
        expect.objectContaining({ key: 'inbox', count: 6, isIncluded: true }),
        expect.objectContaining({
          key: 'running',
          count: 2,
          isIncluded: false,
        }),
        expect.objectContaining({
          key: 'suspended',
          count: 0,
          isIncluded: false,
        }),
        expect.objectContaining({ key: 'paused', count: 0, isIncluded: false }),
        expect.objectContaining({
          key: 'finished',
          count: 3,
          isIncluded: false,
        }),
      ]);
      expect(body.statusBuckets).toContainEqual({
        key: 'backing-off',
        label: 'Backing off',
        statuses: ['backing-off'],
        count: 1,
        isIncluded: true,
      });
      expect(
        body.statusBuckets.find(
          (bucket: { key: string }) => bucket.key === 'running',
        ).isIncluded,
      ).toBe(false);
      expect(body.serviceBuckets).toEqual([
        {
          service: 'Greeter',
          count: 10,
          statusBuckets: [
            {
              key: 'inbox',
              label: 'Inbox',
              statuses: [
                'scheduled',
                'pending',
                'ready',
                'yielded',
                'backing-off',
              ],
              count: 5,
              isIncluded: true,
            },
            {
              key: 'running',
              label: 'Running',
              statuses: ['running'],
              count: 2,
              isIncluded: false,
            },
            {
              key: 'suspended',
              label: 'Suspended',
              statuses: ['suspended'],
              count: 0,
              isIncluded: false,
            },
            {
              key: 'paused',
              label: 'Paused',
              statuses: ['paused'],
              count: 0,
              isIncluded: false,
            },
            {
              key: 'finished',
              label: 'Completed',
              statuses: ['succeeded', 'failed', 'cancelled', 'killed'],
              count: 3,
              isIncluded: false,
            },
          ],
          isIncluded: true,
        },
        {
          service: 'Payments',
          count: 1,
          statusBuckets: [
            {
              key: 'inbox',
              label: 'Inbox',
              statuses: [
                'scheduled',
                'pending',
                'ready',
                'yielded',
                'backing-off',
              ],
              count: 1,
              isIncluded: true,
            },
            {
              key: 'running',
              label: 'Running',
              statuses: ['running'],
              count: 0,
              isIncluded: false,
            },
            {
              key: 'suspended',
              label: 'Suspended',
              statuses: ['suspended'],
              count: 0,
              isIncluded: false,
            },
            {
              key: 'paused',
              label: 'Paused',
              statuses: ['paused'],
              count: 0,
              isIncluded: false,
            },
            {
              key: 'finished',
              label: 'Completed',
              statuses: ['succeeded', 'failed', 'cancelled', 'killed'],
              count: 0,
              isIncluded: false,
            },
          ],
          isIncluded: false,
        },
      ]);
    });
  });

  describe('VQueue sampled', () => {
    it('samples inbox and finished independently inside stage-pruned scans', async () => {
      setResponder((statement) => {
        if (statement.includes('FROM sys_vqueue_meta')) {
          return [
            {
              service_name: 'Greeter',
              inbox: 100,
              running: 10,
              suspended: 0,
              paused: 0,
              finished: 100,
            },
          ];
        }
        return [{ status: 'new', count: 10 }];
      });

      const response = await post('/v2/invocations/summary', {
        mode: { type: 'sampled', sampleSize: 10 },
      });
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                vm.service_name,
                SUM(vm.num_inbox) AS inbox,
                SUM(vm.num_running) AS running,
                SUM(vm.num_suspended) AS suspended,
                SUM(vm.num_paused) AS paused,
                SUM(vm.num_finished) AS finished
              FROM sys_vqueue_meta vm
              WHERE vm.num_inbox > 0
                OR vm.num_running > 0
                OR vm.num_suspended > 0
                OR vm.num_paused > 0
                OR vm.num_finished > 0
              GROUP BY vm.service_name",
          "SELECT
                sampled_inbox.status,
                COUNT(1) AS count
              FROM (
                SELECT
                  v.id,
                  v.status
                FROM sys_vqueues v
                WHERE v.stage = 'inbox'
                  AND v.entry_kind = 'invocation'
                LIMIT 10
              ) sampled_inbox
              GROUP BY sampled_inbox.status",
          "SELECT
                sampled_finished.status,
                COUNT(1) AS count
              FROM (
                SELECT
                  v.id,
                  v.status
                FROM sys_vqueues v
                WHERE v.stage = 'finished'
                  AND v.entry_kind = 'invocation'
                LIMIT 10
              ) sampled_finished
              GROUP BY sampled_finished.status",
        ]
      `);
      expect(body).toMatchObject({
        mode: 'sampled',
        isPartial: true,
        stageCountsArePartial: false,
        sample: { sampleSize: 10 },
      });
      expect(body.stageBuckets).toEqual([
        expect.objectContaining({ key: 'inbox', breakdownIsPartial: true }),
        expect.objectContaining({ key: 'running', breakdownIsPartial: false }),
        expect.objectContaining({
          key: 'suspended',
          breakdownIsPartial: false,
        }),
        expect.objectContaining({ key: 'paused', breakdownIsPartial: false }),
        expect.objectContaining({ key: 'finished', breakdownIsPartial: true }),
      ]);
    });

    it('keeps scope-filtered stage totals on VQueue metadata', async () => {
      setResponder((statement) => {
        if (statement.includes('SUM(vm.num_inbox)')) {
          return [
            {
              service_name: 'Greeter',
              inbox: 100,
              running: 10,
              suspended: 20,
              paused: 30,
              finished: 200,
            },
          ];
        }
        if (statement.includes("stage = 'inbox'")) {
          return [
            { status: 'new', count: 5 },
            { status: 'backing-off', count: 5 },
          ];
        }
        return [
          { status: 'succeeded', count: 8 },
          { status: 'failed', count: 2 },
        ];
      });

      const scopeFilter = {
        type: 'STRING' as const,
        field: 'scope' as const,
        operation: 'EQUALS' as const,
        value: 'susp-10',
      };
      const response = await post('/v2/invocations/summary', {
        filters: [scopeFilter],
        mode: { type: 'sampled', sampleSize: 10 },
      });
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                vm.service_name,
                SUM(vm.num_inbox) AS inbox,
                SUM(vm.num_running) AS running,
                SUM(vm.num_suspended) AS suspended,
                SUM(vm.num_paused) AS paused,
                SUM(vm.num_finished) AS finished
              FROM sys_vqueue_meta vm
              WHERE vm.scope = 'susp-10'
                AND (
                  vm.num_inbox > 0
                  OR vm.num_running > 0
                  OR vm.num_suspended > 0
                  OR vm.num_paused > 0
                  OR vm.num_finished > 0
                )
              GROUP BY vm.service_name",
          "SELECT
                sampled_inbox.status,
                COUNT(1) AS count
              FROM (
                SELECT
                  v.id,
                  v.status
                FROM sys_vqueues v
                WHERE v.stage = 'inbox'
                  AND v.entry_kind = 'invocation'
                LIMIT 10
              ) sampled_inbox
              WHERE sampled_inbox.id IN (
                  SELECT vm.id
                  FROM sys_vqueue_meta vm
                  WHERE vm.scope = 'susp-10'
                    AND vm.num_inbox > 0
                  LIMIT 100000
                )
              GROUP BY sampled_inbox.status",
          "SELECT
                sampled_finished.status,
                COUNT(1) AS count
              FROM (
                SELECT
                  v.id,
                  v.status
                FROM sys_vqueues v
                WHERE v.stage = 'finished'
                  AND v.entry_kind = 'invocation'
                LIMIT 10
              ) sampled_finished
              WHERE sampled_finished.id IN (
                  SELECT vm.id
                  FROM sys_vqueue_meta vm
                  WHERE vm.scope = 'susp-10'
                    AND vm.num_finished > 0
                  LIMIT 100000
                )
              GROUP BY sampled_finished.status",
        ]
      `);
      expect(body.appliedFilters).toEqual([scopeFilter]);
      expect(body.stageCountsArePartial).toBe(false);
      expect(body.stageBuckets).toEqual([
        expect.objectContaining({
          key: 'inbox',
          count: 100,
          breakdownIsPartial: true,
        }),
        expect.objectContaining({
          key: 'running',
          count: 10,
          breakdownIsPartial: false,
        }),
        expect.objectContaining({
          key: 'suspended',
          count: 20,
          breakdownIsPartial: false,
        }),
        expect.objectContaining({
          key: 'paused',
          count: 30,
          breakdownIsPartial: false,
        }),
        expect.objectContaining({
          key: 'finished',
          count: 200,
          breakdownIsPartial: true,
        }),
      ]);
      expect(body.statusBuckets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'pending', count: 50 }),
          expect.objectContaining({ key: 'backing-off', count: 50 }),
          expect.objectContaining({ key: 'running', count: 10 }),
          expect.objectContaining({ key: 'suspended', count: 20 }),
          expect.objectContaining({ key: 'paused', count: 30 }),
          expect.objectContaining({ key: 'succeeded', count: 160 }),
          expect.objectContaining({ key: 'failed', count: 40 }),
        ]),
      );
    });
  });

  describe('filtered invocation status and state', () => {
    it('applies a service filter to the status and state breakdown query', async () => {
      setResponder(() => [
        { service_name: 'Checkout', bucket: 'pending', count: 5 },
        { service_name: 'Checkout', bucket: 'running', count: 2 },
      ]);

      const response = await post('/v2/invocations/summary', {
        filters: [
          {
            type: 'STRING_LIST',
            field: 'target_service_name',
            operation: 'IN',
            value: ['Checkout'],
          },
        ],
        mode: { type: 'exact' },
        view: 'breakdowns',
      });
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.target_service_name AS service_name,
                CASE
                  WHEN ss.status = 'inboxed' THEN 'pending'
                  WHEN ss.status = 'invoked' AND sis.in_flight IS TRUE THEN 'running'
                  WHEN ss.status = 'invoked' THEN 'ready-yielded-backing-off'
                  WHEN ss.status = 'completed' AND ss.completion_result = 'success' THEN 'succeeded'
                  WHEN ss.status = 'completed' THEN 'failed'
                  ELSE ss.status
                END AS bucket,
                COUNT(1) AS count
              FROM sys_invocation_status ss
              LEFT JOIN sys_invocation_state sis ON sis.id = ss.id
              WHERE ss.target_service_name IN ('Checkout')
              GROUP BY
                ss.target_service_name,
                CASE
                  WHEN ss.status = 'inboxed' THEN 'pending'
                  WHEN ss.status = 'invoked' AND sis.in_flight IS TRUE THEN 'running'
                  WHEN ss.status = 'invoked' THEN 'ready-yielded-backing-off'
                  WHEN ss.status = 'completed' AND ss.completion_result = 'success' THEN 'succeeded'
                  WHEN ss.status = 'completed' THEN 'failed'
                  ELSE ss.status
                END",
        ]
      `);
      expect(body.appliedFilters).toEqual([
        {
          type: 'STRING_LIST',
          field: 'target_service_name',
          operation: 'IN',
          value: ['Checkout'],
        },
      ]);
      expect(body).toMatchObject({
        total: 7,
        isPartial: false,
        stageCountsArePartial: false,
      });
    });

    it('separates running and returns coarse per-service buckets', async () => {
      setResponder(() => [
        {
          service_name: 'Greeter',
          bucket: 'ready-yielded-backing-off',
          count: 5,
        },
        { service_name: 'Greeter', bucket: 'running', count: 2 },
        { service_name: 'Payments', bucket: 'succeeded', count: 2 },
      ]);

      const handlerFilter = {
        type: 'STRING' as const,
        field: 'target_handler_name' as const,
        operation: 'EQUALS' as const,
        value: 'run',
      };
      const response = await post('/v2/invocations/summary', {
        highlightFields: ['status', 'target_service_name'],
        filters: [
          handlerFilter,
          {
            type: 'STRING_LIST',
            field: 'status',
            operation: 'IN',
            value: ['backing-off'],
          },
          {
            type: 'STRING_LIST',
            field: 'target_service_name',
            operation: 'IN',
            value: ['Greeter'],
          },
        ],
        mode: { type: 'exact' },
      });
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.target_service_name AS service_name,
                CASE
                  WHEN ss.status = 'inboxed' THEN 'pending'
                  WHEN ss.status = 'invoked' AND sis.in_flight IS TRUE THEN 'running'
                  WHEN ss.status = 'invoked' THEN 'ready-yielded-backing-off'
                  WHEN ss.status = 'completed' AND ss.completion_result = 'success' THEN 'succeeded'
                  WHEN ss.status = 'completed' THEN 'failed'
                  ELSE ss.status
                END AS bucket,
                COUNT(1) AS count
              FROM sys_invocation_status ss
              LEFT JOIN sys_invocation_state sis ON sis.id = ss.id
              WHERE ss.target_handler_name = 'run'
              GROUP BY
                ss.target_service_name,
                CASE
                  WHEN ss.status = 'inboxed' THEN 'pending'
                  WHEN ss.status = 'invoked' AND sis.in_flight IS TRUE THEN 'running'
                  WHEN ss.status = 'invoked' THEN 'ready-yielded-backing-off'
                  WHEN ss.status = 'completed' AND ss.completion_result = 'success' THEN 'succeeded'
                  WHEN ss.status = 'completed' THEN 'failed'
                  ELSE ss.status
                END",
        ]
      `);
      expect(body.appliedFilters).toEqual([handlerFilter]);
      expect(body.statusBuckets).toContainEqual({
        key: 'ready-yielded-backing-off',
        label: 'Ready, yielded or backing off',
        statuses: ['ready', 'yielded', 'backing-off'],
        count: 5,
        isIncluded: true,
      });
      expect(body.stageBuckets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'inbox',
            breakdownCoverage: 'coarse',
            breakdownCanRefine: false,
          }),
          expect.objectContaining({
            key: 'finished',
            breakdownCoverage: 'coarse',
            breakdownCanRefine: false,
          }),
        ]),
      );
      expect(body.statusBuckets).toContainEqual({
        key: 'running',
        label: 'Running',
        statuses: ['running'],
        count: 2,
        isIncluded: false,
      });
      expect(body.isPartial).toBe(false);
      expect(body.serviceBuckets[0]).toMatchObject({
        service: 'Greeter',
        count: 7,
        isIncluded: true,
      });
      expect(body.serviceBuckets[0].statusBuckets).toContainEqual({
        key: 'ready-yielded-backing-off',
        label: 'Ready, yielded or backing off',
        statuses: ['ready', 'yielded', 'backing-off'],
        count: 5,
        isIncluded: true,
      });
    });

    it('limits invocation status before the sampled state join', async () => {
      setResponder(() => [
        {
          service_name: 'Greeter',
          bucket: 'ready-yielded-backing-off',
          count: 3,
        },
        {
          service_name: 'Greeter',
          bucket: 'running',
          count: 2,
        },
      ]);

      const response = await post('/v2/invocations/summary', {
        filters: [
          {
            type: 'STRING',
            field: 'target_handler_name',
            operation: 'EQUALS',
            value: 'run',
          },
        ],
        mode: { type: 'sampled', sampleSize: 5 },
      });
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                sampled_invocations.target_service_name AS service_name,
                CASE
                  WHEN sampled_invocations.status = 'inboxed' THEN 'pending'
                  WHEN sampled_invocations.status = 'invoked' AND sis.in_flight IS TRUE THEN 'running'
                  WHEN sampled_invocations.status = 'invoked' THEN 'ready-yielded-backing-off'
                  WHEN sampled_invocations.status = 'completed' AND sampled_invocations.completion_result = 'success' THEN 'succeeded'
                  WHEN sampled_invocations.status = 'completed' THEN 'failed'
                  ELSE sampled_invocations.status
                END AS bucket,
                COUNT(1) AS count
              FROM (
                SELECT
                  id, target_service_name, status, completion_result, target_handler_name
                FROM sys_invocation_status
                LIMIT 5
              ) sampled_invocations
              LEFT JOIN sys_invocation_state sis ON sis.id = sampled_invocations.id
                WHERE sampled_invocations.target_handler_name = 'run'
              GROUP BY
                sampled_invocations.target_service_name,
                CASE
                  WHEN sampled_invocations.status = 'inboxed' THEN 'pending'
                  WHEN sampled_invocations.status = 'invoked' AND sis.in_flight IS TRUE THEN 'running'
                  WHEN sampled_invocations.status = 'invoked' THEN 'ready-yielded-backing-off'
                  WHEN sampled_invocations.status = 'completed' AND sampled_invocations.completion_result = 'success' THEN 'succeeded'
                  WHEN sampled_invocations.status = 'completed' THEN 'failed'
                  ELSE sampled_invocations.status
                END",
        ]
      `);
      expect(body).toMatchObject({ mode: 'sampled', isPartial: true });
      expect(body.stageCountsArePartial).toBe(true);
    });

    it('returns exact legacy stages and breakdowns from one status scan', async () => {
      setResponder(() => [
        { service_name: 'Checkout', bucket: 'pending', count: 5 },
        { service_name: 'Checkout', bucket: 'ready', count: 7 },
        { service_name: 'Checkout', bucket: 'running', count: 3 },
        { service_name: 'Checkout', bucket: 'succeeded', count: 2 },
      ]);

      const response = await post(
        '/v2/invocations/summary',
        {
          filters: [
            {
              type: 'STRING_LIST',
              field: 'target_service_name',
              operation: 'IN',
              value: ['Checkout'],
            },
          ],
          mode: { type: 'exact' },
          view: 'stages',
        },
        NO_VQUEUE_HEADERS,
      );
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.target_service_name AS service_name,
                CASE
                  WHEN ss.status = 'inboxed' THEN 'pending'
                  WHEN ss.status = 'invoked' AND sis.in_flight IS TRUE THEN 'running'
                  WHEN ss.status = 'invoked' AND sis.retry_count > 0 THEN 'backing-off'
                  WHEN ss.status = 'invoked' THEN 'ready'
                  WHEN ss.status = 'completed' AND ss.completion_result = 'success' THEN 'succeeded'
                  WHEN ss.status = 'completed' THEN 'failed'
                  ELSE ss.status
                END AS bucket,
                COUNT(1) AS count
              FROM sys_invocation_status ss
              LEFT JOIN sys_invocation_state sis ON sis.id = ss.id
              WHERE ss.target_service_name IN ('Checkout')
              GROUP BY
                ss.target_service_name,
                CASE
                  WHEN ss.status = 'inboxed' THEN 'pending'
                  WHEN ss.status = 'invoked' AND sis.in_flight IS TRUE THEN 'running'
                  WHEN ss.status = 'invoked' AND sis.retry_count > 0 THEN 'backing-off'
                  WHEN ss.status = 'invoked' THEN 'ready'
                  WHEN ss.status = 'completed' AND ss.completion_result = 'success' THEN 'succeeded'
                  WHEN ss.status = 'completed' THEN 'failed'
                  ELSE ss.status
                END",
        ]
      `);
      expect(body).toMatchObject({
        mode: 'exact',
        total: 17,
        isPartial: false,
        stageCountsArePartial: false,
      });
      expect(body.sample).toBeUndefined();
      expect(body.stageBuckets).toEqual([
        expect.objectContaining({
          key: 'inbox',
          count: 12,
          breakdownCoverage: 'full',
          breakdownCanRefine: false,
        }),
        expect.objectContaining({ key: 'running', count: 3 }),
        expect.objectContaining({ key: 'suspended', count: 0 }),
        expect.objectContaining({ key: 'paused', count: 0 }),
        expect.objectContaining({ key: 'finished', count: 2 }),
      ]);
      expect(body.statusBuckets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'pending', count: 5 }),
          expect.objectContaining({ key: 'ready', count: 7 }),
          expect.objectContaining({ key: 'running', count: 3 }),
          expect.objectContaining({ key: 'succeeded', count: 2 }),
        ]),
      );
    });

    it('always marks a filtered legacy sample partial', async () => {
      setResponder(() => [
        {
          service_name: 'Checkout',
          bucket: 'pending',
          count: 1,
        },
        {
          service_name: 'Checkout',
          bucket: 'running',
          count: 1,
        },
      ]);

      const response = await post(
        '/v2/invocations/summary',
        {
          filters: [
            {
              type: 'STRING',
              field: 'target_handler_name',
              operation: 'EQUALS',
              value: 'run',
            },
          ],
          mode: { type: 'sampled', sampleSize: 5 },
          view: 'stages',
        },
        NO_VQUEUE_HEADERS,
      );
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                sampled_invocations.target_service_name AS service_name,
                CASE
                  WHEN sampled_invocations.status = 'inboxed' THEN 'pending'
                  WHEN sampled_invocations.status = 'invoked' AND sis.in_flight IS TRUE THEN 'running'
                  WHEN sampled_invocations.status = 'invoked' AND sis.retry_count > 0 THEN 'backing-off'
                  WHEN sampled_invocations.status = 'invoked' THEN 'ready'
                  WHEN sampled_invocations.status = 'completed' AND sampled_invocations.completion_result = 'success' THEN 'succeeded'
                  WHEN sampled_invocations.status = 'completed' THEN 'failed'
                  ELSE sampled_invocations.status
                END AS bucket,
                COUNT(1) AS count
              FROM (
                SELECT
                  id, target_service_name, status, completion_result, target_handler_name
                FROM sys_invocation_status
                LIMIT 5
              ) sampled_invocations
              LEFT JOIN sys_invocation_state sis ON sis.id = sampled_invocations.id
                WHERE sampled_invocations.target_handler_name = 'run'
              GROUP BY
                sampled_invocations.target_service_name,
                CASE
                  WHEN sampled_invocations.status = 'inboxed' THEN 'pending'
                  WHEN sampled_invocations.status = 'invoked' AND sis.in_flight IS TRUE THEN 'running'
                  WHEN sampled_invocations.status = 'invoked' AND sis.retry_count > 0 THEN 'backing-off'
                  WHEN sampled_invocations.status = 'invoked' THEN 'ready'
                  WHEN sampled_invocations.status = 'completed' AND sampled_invocations.completion_result = 'success' THEN 'succeeded'
                  WHEN sampled_invocations.status = 'completed' THEN 'failed'
                  ELSE sampled_invocations.status
                END",
        ]
      `);
      expect(body).toMatchObject({
        mode: 'sampled',
        sample: { sampleSize: 5 },
        total: 2,
        isPartial: true,
        stageCountsArePartial: true,
      });
    });

    it('limits a legacy summary to the selected rolling range', async () => {
      setResponder(() => []);

      const response = await post(
        '/v2/invocations/summary',
        {
          mode: { type: 'exact' },
          range: 'PT1H',
          view: 'stages',
        },
        NO_VQUEUE_HEADERS,
      );
      const body = await response.json();
      const rangeFilter = body.appliedFilters[0];

      expect(rangeFilter).toMatchObject({
        type: 'DATE',
        field: 'created_at',
        operation: 'AFTER',
      });
      expect(Date.parse(rangeFilter.value)).toBeGreaterThan(
        Date.now() - 60 * 60 * 1000 - 1_000,
      );
      expect(sql).toHaveLength(1);
      expect(sql[0]).toContain(`WHERE ss.created_at > '${rangeFilter.value}'`);
      expect(body.mode).toBe('exact');
    });

    it('separates legacy ready and backing-off statuses without yielded', async () => {
      setResponder(() => [
        { service_name: 'Greeter', bucket: 'ready', count: 2 },
        { service_name: 'Greeter', bucket: 'backing-off', count: 1 },
        { service_name: 'Greeter', bucket: 'running', count: 2 },
      ]);

      const response = await post(
        '/v2/invocations/summary',
        { mode: { type: 'exact' } },
        NO_VQUEUE_HEADERS,
      );
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                ss.target_service_name AS service_name,
                CASE
                  WHEN ss.status = 'inboxed' THEN 'pending'
                  WHEN ss.status = 'invoked' AND sis.in_flight IS TRUE THEN 'running'
                  WHEN ss.status = 'invoked' AND sis.retry_count > 0 THEN 'backing-off'
                  WHEN ss.status = 'invoked' THEN 'ready'
                  WHEN ss.status = 'completed' AND ss.completion_result = 'success' THEN 'succeeded'
                  WHEN ss.status = 'completed' THEN 'failed'
                  ELSE ss.status
                END AS bucket,
                COUNT(1) AS count
              FROM sys_invocation_status ss
              LEFT JOIN sys_invocation_state sis ON sis.id = ss.id
              GROUP BY
                ss.target_service_name,
                CASE
                  WHEN ss.status = 'inboxed' THEN 'pending'
                  WHEN ss.status = 'invoked' AND sis.in_flight IS TRUE THEN 'running'
                  WHEN ss.status = 'invoked' AND sis.retry_count > 0 THEN 'backing-off'
                  WHEN ss.status = 'invoked' THEN 'ready'
                  WHEN ss.status = 'completed' AND ss.completion_result = 'success' THEN 'succeeded'
                  WHEN ss.status = 'completed' THEN 'failed'
                  ELSE ss.status
                END",
        ]
      `);
      expect(body.statusBuckets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'ready', count: 2 }),
          expect.objectContaining({ key: 'backing-off', count: 1 }),
        ]),
      );
      expect(body.stageBuckets).toContainEqual(
        expect.objectContaining({
          key: 'inbox',
          breakdownCoverage: 'full',
        }),
      );
      expect(
        body.statusBuckets.some(
          (bucket: { key: string }) =>
            bucket.key === 'yielded' ||
            bucket.key === 'ready-yielded-backing-off',
        ),
      ).toBe(false);
    });
  });

  describe('skipped completed VQueue migration', () => {
    it('samples completed invocations before applying a service filter', async () => {
      setResponder((statement) =>
        statement.includes('FROM sys_vqueue_meta')
          ? [
              {
                service_name: 'Checkout',
                inbox: 0,
                running: 0,
                suspended: 0,
                paused: 0,
              },
            ]
          : [
              {
                service_name: 'Checkout',
                status: 'succeeded',
                count: 2,
              },
            ],
      );

      const response = await post(
        '/v2/invocations/summary',
        {
          filters: [
            {
              type: 'STRING_LIST',
              field: 'target_service_name',
              operation: 'IN',
              value: ['Checkout'],
            },
          ],
          mode: { type: 'sampled', sampleSize: 5 },
          view: 'stages',
        },
        VQUEUE_SKIP_COMPLETED_HEADERS,
      );
      const body = await response.json();

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                vm.service_name,
                SUM(vm.num_inbox) AS inbox,
                SUM(vm.num_running) AS running,
                SUM(vm.num_suspended) AS suspended,
                SUM(vm.num_paused) AS paused
              FROM sys_vqueue_meta vm
              WHERE vm.service_name IN ('Checkout')
                AND (
                  vm.num_inbox > 0
                  OR vm.num_running > 0
                  OR vm.num_suspended > 0
                  OR vm.num_paused > 0
                )
              GROUP BY vm.service_name",
          "SELECT
                sampled_finished.target_service_name AS service_name,
                CASE
                  WHEN sampled_finished.completion_result = 'success' THEN 'succeeded'
                  ELSE 'failed'
                END AS status,
                COUNT(1) AS count
              FROM (
                SELECT
                  target_service_name, completion_result
                FROM sys_invocation_status ss
                WHERE ss.status = 'completed'
                LIMIT 5
              ) sampled_finished
              WHERE sampled_finished.target_service_name IN ('Checkout')
              GROUP BY
                sampled_finished.target_service_name,
                CASE
                  WHEN sampled_finished.completion_result = 'success' THEN 'succeeded'
                  ELSE 'failed'
                END",
        ]
      `);
      expect(body).toMatchObject({
        mode: 'sampled',
        total: 2,
        isPartial: true,
        stageCountsArePartial: true,
      });
    });

    it('returns live stages without waiting for completed invocation status', async () => {
      setResponder(() => [
        {
          service_name: 'Greeter',
          inbox: 5,
          running: 2,
          suspended: 1,
          paused: 3,
        },
      ]);

      const response = await post(
        '/v2/invocations/summary',
        { mode: { type: 'exact' }, view: 'live-stages' },
        VQUEUE_SKIP_COMPLETED_HEADERS,
      );
      const body = await response.json();

      expect(sql).toHaveLength(1);
      expect(sql[0]).toContain('FROM sys_vqueue_meta vm');
      expect(sql[0]).not.toContain('sys_invocation_status');
      expect(body.total).toBe(11);
      expect(
        body.stageBuckets.map((stage: { key: string }) => stage.key),
      ).toEqual(['inbox', 'running', 'suspended', 'paused']);
      expect(body.serviceBuckets[0].statusBuckets).not.toContainEqual(
        expect.objectContaining({ key: 'finished' }),
      );
      expect(body.stageCountsArePartial).toBe(false);
    });

    it('keeps yielded in the coarse live-status bucket', async () => {
      setResponder(() => [
        {
          service_name: 'Greeter',
          bucket: 'ready-yielded-backing-off',
          count: 3,
        },
      ]);

      const response = await post(
        '/v2/invocations/summary',
        {
          filters: [
            {
              type: 'STRING',
              field: 'target_handler_name',
              operation: 'EQUALS',
              value: 'run',
            },
          ],
          mode: { type: 'exact' },
          view: 'breakdowns',
        },
        VQUEUE_SKIP_COMPLETED_HEADERS,
      );
      const body = await response.json();

      expect(body.statusBuckets).toContainEqual({
        key: 'ready-yielded-backing-off',
        label: 'Ready, yielded or backing off',
        statuses: ['ready', 'yielded', 'backing-off'],
        count: 3,
        isIncluded: true,
      });
    });

    it('uses invocation status only for terminal summary buckets', async () => {
      await post(
        '/v2/invocations/summary',
        { mode: { type: 'exact' } },
        VQUEUE_SKIP_COMPLETED_HEADERS,
      );

      expect(sql[2]).toMatchInlineSnapshot(`
        "SELECT
                ss.target_service_name AS service_name,
                CASE
                  WHEN ss.completion_result = 'success' THEN 'succeeded'
                  ELSE 'failed'
                END AS status,
                COUNT(1) AS count
              FROM sys_invocation_status ss
              WHERE ss.status = 'completed'
              GROUP BY
                ss.target_service_name,
                CASE
                  WHEN ss.completion_result = 'success' THEN 'succeeded'
                  ELSE 'failed'
                END"
      `);
    });

    it('applies a service filter to live metadata and terminal status', async () => {
      await post(
        '/v2/invocations/summary',
        {
          filters: [
            {
              type: 'STRING_LIST',
              field: 'target_service_name',
              operation: 'IN',
              value: ['Checkout'],
            },
          ],
          mode: { type: 'exact' },
          view: 'stages',
        },
        VQUEUE_SKIP_COMPLETED_HEADERS,
      );

      expect(sql).toMatchInlineSnapshot(`
        [
          "SELECT
                vm.service_name,
                SUM(vm.num_inbox) AS inbox,
                SUM(vm.num_running) AS running,
                SUM(vm.num_suspended) AS suspended,
                SUM(vm.num_paused) AS paused
              FROM sys_vqueue_meta vm
              WHERE vm.service_name IN ('Checkout')
                AND (
                  vm.num_inbox > 0
                  OR vm.num_running > 0
                  OR vm.num_suspended > 0
                  OR vm.num_paused > 0
                )
              GROUP BY vm.service_name",
          "SELECT
                ss.target_service_name AS service_name,
                CASE
                  WHEN ss.completion_result = 'success' THEN 'succeeded'
                  ELSE 'failed'
                END AS status,
                COUNT(1) AS count
              FROM sys_invocation_status ss
              WHERE ss.status = 'completed'
                AND ss.target_service_name IN ('Checkout')
              GROUP BY
                ss.target_service_name,
                CASE
                  WHEN ss.completion_result = 'success' THEN 'succeeded'
                  ELSE 'failed'
                END",
        ]
      `);
    });
  });
});
