import { render, screen } from '@testing-library/react';
import { WorkflowStatsCard } from './WorkflowStatsCard';

describe('WorkflowStatsCard', () => {
  it('renders the execution statistics without VQueue navigation', () => {
    render(
      <WorkflowStatsCard
        stats={{
          supported: true,
          duration: 'PT1.528S',
          pendingPromiseCount: 0,
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Execution' })).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Workflow duration').closest('a')).toBeNull();
    expect(screen.getByText('1.528s').closest('a')).toBeNull();
  });

  it('shows Workflow interaction help beside the execution field', () => {
    render(
      <WorkflowStatsCard
        stats={{
          supported: true,
          pendingPromiseCount: 0,
        }}
      />,
    );

    expect(screen.getByText('Last interaction')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Explain Workflow interactions',
      }),
    ).toBeTruthy();
  });
});
