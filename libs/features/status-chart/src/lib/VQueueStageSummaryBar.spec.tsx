import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

const originalGetAnimations = Element.prototype.getAnimations;

beforeEach(() => {
  Element.prototype.getAnimations = () => [];
});

afterEach(() => {
  cleanup();
  if (originalGetAnimations)
    Element.prototype.getAnimations = originalGetAnimations;
  else Reflect.deleteProperty(Element.prototype, 'getAnimations');
  vi.unstubAllGlobals();
});

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
      ).toBe('Not completed~63');
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
      ).toBe('Not completed~60');
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

  it('reserves a loading segment while the completed population is loading', async () => {
    const liveStages = totalsByStage.filter(({ name }) => name !== 'finished');
    render(
      <MemoryRouter>
        <VQueueStageSummaryBar
          byStage={liveStages}
          byStatus={[]}
          focus="all"
          onFocusChange={() => undefined}
          breakdownMode="exact"
          canSampleBreakdown={false}
          onBreakdownModeChange={() => undefined}
          isBreakdownSampled={false}
          isBreakdownLoading={(stage) => stage === 'finished'}
          getHref={() => '/invocations'}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const rail = screen.getByLabelText(
        'All-status invocation distribution with current status highlighted',
      );
      const completedLoadingSegment = screen.getByLabelText(
        'Completed distribution loading',
      );
      expect(rail.children).toHaveLength(3);
      expect((rail.children[2] as HTMLElement).style.flexGrow).toBe('1');
      expect(completedLoadingSegment).toBeTruthy();
      expect(
        screen.getByRole('tab', { name: /Completed count loading/ })
          .textContent,
      ).toBe('Completed');
      expect(
        screen.getByRole('tab', { name: /All-status count loading/ })
          .textContent,
      ).toBe('All statuses');
    });
  });

  it('distinguishes an empty estimate from a confirmed empty population', async () => {
    const sampledZeroStages = totalsByStage.map((stage) => ({
      ...stage,
      count: 0,
    }));
    render(
      <MemoryRouter>
        <VQueueStageSummaryBar
          byStage={sampledZeroStages}
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
        screen.getByRole('tab', { name: 'Not completed' }).textContent,
      ).toBe('Not completed');
    });
    expect(screen.queryByText('—')).toBeNull();
    expect(
      screen.getByLabelText(
        'Not-completed invocation distribution with current status highlighted',
      ).children,
    ).toHaveLength(1);
  });

  it('keeps the selected tab and rail on the committed filter until navigation completes', async () => {
    vi.stubGlobal('CSS', { escape: (value: string) => value });
    const onFocusChange = vi.fn();
    const props = {
      byStage: totalsByStage,
      byStatus: [],
      onFocusChange,
      breakdownMode: 'exact' as const,
      canSampleBreakdown: false,
      onBreakdownModeChange: vi.fn(),
      isBreakdownSampled: false,
    };
    const { rerender } = render(
      <MemoryRouter>
        <VQueueStageSummaryBar {...props} focus="not-completed" />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('tab', { name: /All statuses/ }));
    expect(onFocusChange).toHaveBeenCalledWith('all');
    expect(screen.getByRole('tab', { selected: true }).textContent).toBe(
      'Not completed106',
    );
    expect(
      screen.queryByLabelText(
        'All-status invocation distribution with current status highlighted',
      ),
    ).toBeNull();
    rerender(
      <MemoryRouter>
        <VQueueStageSummaryBar {...props} focus="all" />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole('tab', { selected: true }).textContent).toBe(
        'All statuses146',
      ),
    );
    expect(
      screen.getByLabelText(
        'All-status invocation distribution with current status highlighted',
      ),
    ).toBeTruthy();
  });

  it.each(['all', 'completed'] as const)(
    'does not show zero when missing completed counts fail in %s focus',
    async (focus) => {
      render(
        <MemoryRouter>
          <VQueueStageSummaryBar
            byStage={totalsByStage.filter(({ name }) => name !== 'finished')}
            byStatus={[]}
            focus={focus}
            onFocusChange={vi.fn()}
            breakdownMode="exact"
            canSampleBreakdown={false}
            onBreakdownModeChange={vi.fn()}
            isBreakdownSampled={false}
            isBreakdownError={(name) => name === 'finished'}
          />
        </MemoryRouter>,
      );
      expect(
        await screen.findByLabelText('Completed count unavailable'),
      ).toBeTruthy();
      expect(
        screen.getByLabelText('All-status count unavailable'),
      ).toBeTruthy();
      expect(
        screen.getByText('Could not load invocation counts.'),
      ).toBeTruthy();
      expect(
        screen.getByRole('tab', { name: /Not completed/ }).textContent,
      ).toBe('Not completed106');
    },
  );

  it('shows unavailable rather than an empty population after the stage request fails', async () => {
    render(
      <MemoryRouter>
        <VQueueStageSummaryBar
          byStage={[]}
          byStatus={[]}
          focus="all"
          onFocusChange={vi.fn()}
          breakdownMode="exact"
          canSampleBreakdown={false}
          onBreakdownModeChange={vi.fn()}
          isBreakdownSampled={false}
          isError
        />
      </MemoryRouter>,
    );
    expect(
      await screen.findByLabelText('Not-completed count unavailable'),
    ).toBeTruthy();
    expect(screen.getByText('Could not load invocation counts.')).toBeTruthy();
  });
});
