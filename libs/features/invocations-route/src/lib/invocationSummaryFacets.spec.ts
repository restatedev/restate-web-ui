import { describe, expect, it } from 'vitest';
import type { components } from '@restate/data-access/admin-api-spec';
import { getInvocationSummaryFacets } from './invocationSummaryFacets';

type InvocationSummary = components['schemas']['SummaryInvocationsV2Response'];
type InvocationFilter = components['schemas']['InvocationV2FilterItem'];

const summary: InvocationSummary = {
  queryDurationMs: 1,
  mode: 'exact',
  isPartial: false,
  stageCountsArePartial: false,
  total: 100,
  appliedFilters: [],
  stageBuckets: [
    {
      key: 'inbox',
      label: 'Inbox',
      statuses: ['pending', 'backing-off'],
      count: 70,
      breakdownIsPartial: false,
      breakdownCoverage: 'full',
      breakdownCanRefine: false,
      isIncluded: true,
    },
    {
      key: 'finished',
      label: 'Completed',
      statuses: ['succeeded'],
      count: 30,
      breakdownIsPartial: false,
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
      count: 40,
      isIncluded: true,
    },
    {
      key: 'backing-off',
      label: 'Backing off',
      statuses: ['backing-off'],
      count: 30,
      isIncluded: true,
    },
    {
      key: 'succeeded',
      label: 'Succeeded',
      statuses: ['succeeded'],
      count: 30,
      isIncluded: true,
    },
  ],
  serviceBuckets: [
    {
      service: 'A',
      count: 60,
      isIncluded: true,
      statusBuckets: [
        {
          key: 'inbox',
          label: 'Inbox',
          statuses: ['pending', 'backing-off'],
          count: 50,
          isIncluded: true,
        },
        {
          key: 'finished',
          label: 'Completed',
          statuses: ['succeeded'],
          count: 10,
          isIncluded: true,
        },
      ],
    },
    {
      service: 'B',
      count: 40,
      isIncluded: false,
      statusBuckets: [
        {
          key: 'inbox',
          label: 'Inbox',
          statuses: ['pending', 'backing-off'],
          count: 20,
          isIncluded: true,
        },
        {
          key: 'finished',
          label: 'Completed',
          statuses: ['succeeded'],
          count: 20,
          isIncluded: true,
        },
      ],
    },
  ],
};

const serviceFilter: InvocationFilter = {
  field: 'target_service_name',
  type: 'STRING_LIST',
  operation: 'IN',
  value: ['A'],
};

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing test fixture value');
  return value;
}

describe('getInvocationSummaryFacets', () => {
  it('uses the population buckets without a service filter', () => {
    const facets = getInvocationSummaryFacets(summary, []);

    expect(facets.hasServiceFilter).toBe(false);
    expect(facets.byStage.map(({ count }) => count)).toEqual([70, 30]);
    expect(facets.byStatus.map(({ count }) => count)).toEqual([40, 30, 30]);
  });

  it('scopes stages to matching services and uses the contextual status breakdown', () => {
    const inboxStage = required(summary.stageBuckets[0]);
    const finishedStage = required(summary.stageBuckets[1]);
    const succeededStatus = required(summary.statusBuckets[2]);
    const contextualSummary: InvocationSummary = {
      ...summary,
      total: 60,
      stageBuckets: [
        {
          ...inboxStage,
          count: 50,
          breakdownIsPartial: true,
        },
        { ...finishedStage, count: 10 },
      ],
      statusBuckets: [
        {
          key: 'ready-yielded-backing-off',
          label: 'Ready, yielded or backing off',
          statuses: ['ready', 'yielded', 'backing-off'],
          count: 50,
          isIncluded: true,
        },
        { ...succeededStatus, count: 10 },
      ],
    };
    const contextualInboxBreakdown: components['schemas']['InboxInvocationsStatusBreakdownV2Response'] =
      {
        groupBy: 'status',
        total: 50,
        byStatus: [
          { status: 'pending', count: 30 },
          { status: 'backing-off', count: 20 },
        ],
        isPartial: true,
      };
    const facets = getInvocationSummaryFacets(
      summary,
      [serviceFilter],
      contextualSummary,
      contextualInboxBreakdown,
    );

    expect(facets.hasServiceFilter).toBe(true);
    expect(facets.byStage.map(({ count }) => count)).toEqual([50, 10]);
    expect(facets.byStatus.map(({ key, count }) => [key, count])).toEqual([
      ['pending', 30],
      ['backing-off', 20],
      ['succeeded', 10],
    ]);
    expect(facets.byStage[0]?.breakdownIsPartial).toBe(true);
    expect(facets.populationByStage.map(({ count }) => count)).toEqual([
      70, 30,
    ]);
  });

  it('does not replace a pending contextual breakdown with coarse service buckets', () => {
    const facets = getInvocationSummaryFacets(summary, [serviceFilter]);

    expect(facets.byStatus).toEqual([]);
  });

  it('orders a dedicated Inbox breakdown by lifecycle status', () => {
    const facets = getInvocationSummaryFacets(
      summary,
      [serviceFilter],
      summary,
      {
        groupBy: 'status',
        total: 50,
        byStatus: [
          { status: 'backing-off', count: 10 },
          { status: 'ready', count: 10 },
          { status: 'scheduled', count: 10 },
          { status: 'yielded', count: 10 },
          { status: 'pending', count: 10 },
        ],
        isPartial: false,
      },
    );

    expect(facets.byStatus.map(({ key }) => key)).toEqual([
      'scheduled',
      'pending',
      'yielded',
      'ready',
      'backing-off',
      'succeeded',
    ]);
  });
});
