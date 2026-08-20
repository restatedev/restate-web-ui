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
  it('keeps population totals while displaying a reconciled selected bucket', async () => {
    render(
      <MemoryRouter>
        <VQueueStageSummaryBar
          byStage={totalsByStage.map((stage) =>
            stage.name === 'running' ? { ...stage, count: 5 } : stage,
          )}
          byStatus={[]}
          totalsByStage={totalsByStage}
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
        screen.getByRole('tab', { name: /Not completed/ }).textContent,
      ).toBe('Not completed106');
      expect(screen.getByRole('link', { name: /Running: 5/ })).toBeTruthy();
    });
  });
});
