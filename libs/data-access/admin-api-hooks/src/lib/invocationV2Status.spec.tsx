import type { components } from '@restate/data-access/admin-api-spec';
import { describe, expect, it } from 'vitest';
import {
  getInvocationSummaryStageCount,
  getInvocationStatusBreakdownV2,
  getServiceInvocationStageBreakdownV2,
  getServiceInvocationStatusBreakdownV2,
} from './invocationV2Status';
import { isCompletedInvocationStatus } from './hooks';

const summary: components['schemas']['SummaryInvocationsV2Response'] = {
  queryDurationMs: 25,
  mode: 'sampled',
  isPartial: true,
  stageCountsArePartial: false,
  total: 140,
  appliedFilters: [],
  stageBuckets: [
    {
      key: 'inbox',
      label: 'Inbox',
      statuses: ['pending', 'scheduled', 'ready', 'yielded', 'backing-off'],
      count: 4,
      breakdownIsPartial: false,
      breakdownCoverage: 'full',
      breakdownCanRefine: false,
      isIncluded: true,
    },
    {
      key: 'running',
      label: 'Running',
      statuses: ['running'],
      count: 6,
      breakdownIsPartial: false,
      breakdownCoverage: 'full',
      breakdownCanRefine: false,
      isIncluded: true,
    },
    {
      key: 'paused',
      label: 'Paused',
      statuses: ['paused'],
      count: 10,
      breakdownIsPartial: false,
      breakdownCoverage: 'full',
      breakdownCanRefine: false,
      isIncluded: true,
    },
    {
      key: 'finished',
      label: 'Completed',
      statuses: ['succeeded', 'failed', 'cancelled', 'killed'],
      count: 120,
      breakdownIsPartial: true,
      breakdownCoverage: 'full',
      breakdownCanRefine: false,
      isIncluded: true,
    },
  ],
  statusBuckets: [
    {
      key: 'pending',
      label: 'Pending',
      statuses: ['pending'],
      count: 3,
      isIncluded: true,
    },
    {
      key: 'scheduled',
      label: 'Scheduled',
      statuses: ['scheduled'],
      count: 1,
      isIncluded: true,
    },
    {
      key: 'running',
      label: 'Running',
      statuses: ['running'],
      count: 6,
      isIncluded: true,
    },
    {
      key: 'paused',
      label: 'Paused',
      statuses: ['paused'],
      count: 10,
      isIncluded: true,
    },
    {
      key: 'succeeded',
      label: 'Succeeded',
      statuses: ['succeeded'],
      count: 100,
      isIncluded: true,
    },
    {
      key: 'failed',
      label: 'Failed',
      statuses: ['failed'],
      count: 20,
      isIncluded: true,
    },
  ],
  serviceBuckets: [
    {
      service: 'Checkout',
      count: 130,
      isIncluded: true,
      statusBuckets: [
        {
          key: 'inbox',
          label: 'Inbox',
          statuses: ['pending', 'scheduled', 'ready', 'yielded', 'backing-off'],
          count: 100,
          isIncluded: true,
        },
        {
          key: 'running',
          label: 'Running',
          statuses: ['running'],
          count: 20,
          isIncluded: true,
        },
        {
          key: 'paused',
          label: 'Paused',
          statuses: ['paused'],
          count: 10,
          isIncluded: true,
        },
      ],
    },
  ],
};

describe('invocation V2 status composition', () => {
  it.each(['succeeded', 'failed', 'cancelled', 'killed'] as const)(
    'treats %s as completed',
    (status) => {
      expect(isCompletedInvocationStatus(status)).toBe(true);
    },
  );

  it('does not treat live or missing statuses as completed', () => {
    expect(isCompletedInvocationStatus('running')).toBe(false);
    expect(isCompletedInvocationStatus()).toBe(false);
  });

  it('reads stage and status counts from the unified summary response', () => {
    expect(getInvocationSummaryStageCount(summary, 'finished')).toBe(120);
    expect(getInvocationStatusBreakdownV2(summary)).toEqual([
      { name: 'pending', count: 3 },
      { name: 'scheduled', count: 1 },
      { name: 'running', count: 6 },
      { name: 'paused', count: 10 },
      { name: 'succeeded', count: 100 },
      { name: 'failed', count: 20 },
    ]);
  });

  it('uses a coarse stage while its detailed breakdown is unavailable', () => {
    const inboxStage = summary.stageBuckets.find(
      (stage) => stage.key === 'inbox',
    );
    if (!inboxStage) throw new Error('Inbox stage fixture is missing');
    const stagesOnly: components['schemas']['SummaryInvocationsV2Response'] = {
      ...summary,
      stageBuckets: [
        {
          ...inboxStage,
          breakdownCoverage: 'missing',
          breakdownCanRefine: true,
        },
      ],
      statusBuckets: [],
    };

    expect(getInvocationStatusBreakdownV2(stagesOnly)).toEqual([
      { name: 'inbox', count: 4 },
    ]);
  });

  it('preserves an empty grouped terminal failure bucket', () => {
    const finishedStage = summary.stageBuckets.find(
      (stage) => stage.key === 'finished',
    );
    if (!finishedStage) throw new Error('Finished stage fixture is missing');
    const groupedSummary: components['schemas']['SummaryInvocationsV2Response'] =
      {
        ...summary,
        stageBuckets: [finishedStage],
        statusBuckets: [
          {
            key: 'succeeded',
            label: 'Succeeded',
            statuses: ['succeeded'],
            count: 100,
            isIncluded: true,
          },
          {
            key: 'failed',
            label: 'Failed, cancelled or killed',
            statuses: ['failed', 'cancelled', 'killed'],
            count: 0,
            isIncluded: true,
          },
        ],
      };

    expect(getInvocationStatusBreakdownV2(groupedSummary)).toEqual([
      { name: 'succeeded', count: 100 },
      {
        name: 'failed',
        label: 'Failed, cancelled or killed',
        statuses: ['failed', 'cancelled', 'killed'],
        count: 0,
      },
    ]);
  });

  it('derives service stages from response-defined service buckets', () => {
    expect(getServiceInvocationStageBreakdownV2(summary, 'Checkout')).toEqual([
      { name: 'inbox', count: 100 },
      { name: 'running', count: 20 },
      { name: 'paused', count: 10 },
    ]);
  });

  it('combines a lazy service inbox breakdown with its other stages', () => {
    expect(
      getServiceInvocationStatusBreakdownV2(summary, 'Checkout', {
        groupBy: 'status',
        total: 100,
        byStatus: [
          { status: 'pending', count: 80 },
          { status: 'ready', count: 20 },
        ],
        isPartial: false,
      }),
    ).toEqual(
      new Map([
        ['pending', 80],
        ['ready', 20],
        ['running', 20],
        ['paused', 10],
      ]),
    );
  });
});
