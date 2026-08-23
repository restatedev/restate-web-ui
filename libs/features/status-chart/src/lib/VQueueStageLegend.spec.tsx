import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { VQueueStageLegend } from './VQueueStageLegend';

const stages = [
  {
    name: 'inbox',
    label: 'Inbox',
    count: 55,
    statuses: ['pending', 'backing-off'],
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
    statuses: ['succeeded', 'failed'],
    breakdownIsPartial: false,
  },
];

describe('VQueueStageLegend', () => {
  it('omits metrics when the stage counts are partial', () => {
    render(
      <MemoryRouter>
        <VQueueStageLegend
          byStage={stages}
          byStatus={[]}
          focus="not-completed"
          isBreakdownSampled
          areStageCountsPartial
          getHref={() => '/invocations'}
        />
      </MemoryRouter>,
    );

    const legend = screen.getByLabelText('Invocation stage legend');
    expect(legend.textContent).toBe('InboxRunningSuspendedPaused');
    expect(screen.getByRole('link', { name: 'Inbox' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Running' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Paused' })).toBeTruthy();
  });

  it('shows compact stage counts when they are accurate', () => {
    render(
      <MemoryRouter>
        <VQueueStageLegend
          byStage={stages}
          byStatus={[]}
          focus="not-completed"
          isBreakdownSampled
          getHref={() => '/invocations'}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Inbox: 55' }).textContent).toBe(
      'Inbox55',
    );
    expect(screen.getByRole('link', { name: 'Running: 1' }).textContent).toBe(
      'Running1',
    );
    expect(screen.getByRole('link', { name: 'Suspended: 0' }).textContent).toBe(
      'Suspended0',
    );
    expect(screen.getByRole('link', { name: 'Paused: 7' }).textContent).toBe(
      'Paused7',
    );
  });

  it('shows a loading metric while the completed population is loading', () => {
    render(
      <MemoryRouter>
        <VQueueStageLegend
          byStage={stages.filter(({ name }) => name !== 'finished')}
          byStatus={[]}
          focus="all"
          isBreakdownSampled={false}
          isBreakdownLoading={(stage) => stage === 'finished'}
          getHref={() => '/invocations'}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('link', { name: 'Completed: loading' }).textContent,
    ).toBe('CompletedLoading');
    expect(screen.queryByRole('link', { name: 'Completed: 0' })).toBeNull();
  });

  it('uses the population to keep filtered-out stage labels present', () => {
    const matchingStages = stages.map((stage) => ({
      ...stage,
      count: stage.name === 'inbox' ? 10 : 0,
    }));

    render(
      <MemoryRouter>
        <VQueueStageLegend
          byStage={matchingStages}
          byStatus={[]}
          populationByStage={stages}
          focus="not-completed"
          isBreakdownSampled
          areStageCountsPartial
          getHref={() => '/invocations'}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Running' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Paused' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Completed' })).toBeNull();
  });

  it('omits partial population outcome metrics in completed focus', () => {
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
        count: 7,
        statuses: ['failed'],
      },
    ];

    render(
      <MemoryRouter>
        <VQueueStageLegend
          byStage={stages}
          byStatus={[populationStatuses[1]]}
          populationByStage={stages}
          populationByStatus={populationStatuses}
          focus="completed"
          isBreakdownSampled
          areStageCountsPartial
          getHref={() => '/invocations'}
        />
      </MemoryRouter>,
    );

    const legend = screen.getByLabelText('Invocation stage legend');
    expect(legend.textContent).toBe('SucceededFailed');
    expect(screen.getByRole('link', { name: 'Succeeded' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Failed' })).toBeTruthy();
  });
});
