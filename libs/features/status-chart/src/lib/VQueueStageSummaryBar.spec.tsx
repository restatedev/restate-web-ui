import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { VQueueStageSummaryBar } from './VQueueStageSummaryBar';

const totalsByStage = [
  {
    name: 'inbox',
    label: 'Inbox',
    count: 100,
    statuses: ['pending'],
    breakdownIsPartial: false,
  },
  {
    name: 'running',
    label: 'Running',
    count: 6,
    statuses: ['running'],
    breakdownIsPartial: false,
  },
  {
    name: 'finished',
    label: 'Completed',
    count: 40,
    statuses: ['succeeded'],
    breakdownIsPartial: false,
  },
];

describe('VQueueStageSummaryBar', () => {
  it('shows distribution totals in focus controls while displaying current matches', async () => {
    render(
      <MemoryRouter>
        <VQueueStageSummaryBar
          byStage={totalsByStage.map((stage) =>
            stage.name === 'running' ? { ...stage, count: 5 } : stage,
          )}
          byStatus={[]}
          focus="not-completed"
          onFocusChange={() => undefined}
          breakdownMode="exact"
          canSampleBreakdown={false}
          onBreakdownModeChange={() => undefined}
          isBreakdownSampled={false}
          getHref={() => '/invocations'}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('tab', { name: /All statuses/ }).textContent,
      ).toBe('All statuses145');
      expect(
        screen.getByRole('tab', { name: /Not completed/ }).textContent,
      ).toBe('Not completed105');
      expect(screen.getByRole('link', { name: /Running: 5/ })).toBeTruthy();
      expect(
        screen.getByLabelText(
          'Not-completed invocation distribution with current status highlighted',
        ).children,
      ).toHaveLength(2);
    });
  });

  it('uses the focused lifecycle population for estimated highlights', async () => {
    const stages = [
      {
        name: 'inbox',
        label: 'Inbox',
        count: 55,
        statuses: ['pending'],
        breakdownIsPartial: true,
      },
      {
        name: 'running',
        label: 'Running',
        count: 1,
        statuses: ['running'],
        breakdownIsPartial: false,
      },
      {
        name: 'paused',
        label: 'Paused',
        count: 7,
        statuses: ['paused'],
        breakdownIsPartial: false,
      },
      {
        name: 'finished',
        label: 'Completed',
        count: 37,
        statuses: ['succeeded'],
        breakdownIsPartial: false,
      },
    ];

    render(
      <MemoryRouter>
        <VQueueStageSummaryBar
          byStage={stages}
          byStatus={[]}
          focus="not-completed"
          onFocusChange={() => undefined}
          breakdownMode="estimate"
          canSampleBreakdown={false}
          onBreakdownModeChange={() => undefined}
          isBreakdownSampled
          areStageCountsPartial
          getHref={() => '/invocations'}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('tab', { name: /Not completed/ }).textContent,
      ).toBe('Not completed63');
      expect(
        screen.getByRole('link', {
          name: 'Inbox: ~87% of 63 not-completed invocations across all services',
        }),
      ).toBeTruthy();
      expect(
        screen.getByRole('link', {
          name: 'Paused: ~11% of 63 not-completed invocations across all services',
        }),
      ).toBeTruthy();
      expect(screen.queryByRole('link', { name: /Completed:/ })).toBeNull();
    });
  });

  it('uses one focused denominator for every selected-service highlight', async () => {
    const matchingStages = [
      {
        name: 'inbox',
        label: 'Inbox',
        count: 10,
        statuses: ['pending'],
        breakdownIsPartial: true,
      },
      {
        name: 'running',
        label: 'Running',
        count: 5,
        statuses: ['running'],
        breakdownIsPartial: false,
      },
      {
        name: 'finished',
        label: 'Completed',
        count: 5,
        statuses: ['succeeded'],
        breakdownIsPartial: false,
      },
    ];
    const populationStages = matchingStages.map((stage) => ({
      ...stage,
      count: stage.name === 'inbox' ? 50 : stage.name === 'running' ? 10 : 40,
    }));
    render(
      <MemoryRouter>
        <VQueueStageSummaryBar
          byStage={matchingStages}
          byStatus={[]}
          populationByStage={populationStages}
          focus="not-completed"
          onFocusChange={() => undefined}
          breakdownMode="estimate"
          canSampleBreakdown={false}
          onBreakdownModeChange={() => undefined}
          isBreakdownSampled
          areStageCountsPartial
          getHref={() => '/invocations'}
          comparisonScope="service"
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('tab', { name: /Not completed/ }).textContent,
      ).toBe('Not completed60');
      expect(
        screen.getByRole('link', {
          name: 'Inbox: ~17% of 60 not-completed invocations in the selected service',
        }),
      ).toBeTruthy();
      expect(
        screen.getByRole('link', {
          name: 'Running: ~8% of 60 not-completed invocations in the selected service',
        }),
      ).toBeTruthy();
      expect(screen.queryByRole('link', { name: /Completed:/ })).toBeNull();
      const rail = screen.getByLabelText(
        'Not-completed invocation distribution with current status highlighted',
      );
      expect(rail.children).toHaveLength(2);
      expect((rail.children[0] as HTMLElement).style.flexGrow).toBe('50');
    });
  });

  it('shows only terminal outcomes in completed focus', async () => {
    const populationStages = [
      {
        name: 'inbox',
        label: 'Inbox',
        count: 50,
        statuses: ['pending'],
        breakdownIsPartial: false,
      },
      {
        name: 'finished',
        label: 'Completed',
        count: 40,
        statuses: ['succeeded', 'failed'],
        breakdownIsPartial: false,
      },
    ];
    const populationStatuses = [
      {
        name: 'succeeded',
        label: 'Succeeded',
        count: 30,
        statuses: ['succeeded'],
      },
      {
        name: 'failed',
        label: 'Failed',
        count: 10,
        statuses: ['failed'],
      },
    ];

    render(
      <MemoryRouter>
        <VQueueStageSummaryBar
          byStage={populationStages}
          byStatus={populationStatuses}
          populationByStage={populationStages}
          populationByStatus={populationStatuses}
          focus="completed"
          onFocusChange={() => undefined}
          breakdownMode="exact"
          canSampleBreakdown={false}
          onBreakdownModeChange={() => undefined}
          isBreakdownSampled={false}
          getHref={() => '/invocations'}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const rail = screen.getByLabelText(
        'Completed invocation outcome distribution with current status highlighted',
      );
      expect(rail.children).toHaveLength(1);
      expect(
        screen.getByRole('link', { name: /Succeeded: 30 of 40/ }),
      ).toBeTruthy();
      expect(
        screen.getByRole('link', { name: /Failed: 10 of 40/ }),
      ).toBeTruthy();
      expect(screen.queryByRole('link', { name: /Inbox:/ })).toBeNull();
    });
  });
});
