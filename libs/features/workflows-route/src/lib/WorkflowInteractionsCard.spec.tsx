import { render, screen } from '@testing-library/react';
import { WorkflowInteractionsCard } from './WorkflowInteractionsCard';

describe('WorkflowInteractionsCard', () => {
  it('renders interaction statistics without execution timing', () => {
    render(
      <WorkflowInteractionsCard
        stats={{
          supported: true,
          pendingPromiseCount: 0,
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Interactions' })).toBeTruthy();
    expect(screen.getByText('Last interaction')).toBeTruthy();
    expect(screen.getByText('Pending promises')).toBeTruthy();
    expect(screen.queryByText('Workflow duration')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows Workflow interaction help beside the card title', () => {
    render(
      <WorkflowInteractionsCard
        stats={{
          supported: true,
          pendingPromiseCount: 0,
        }}
      />,
    );

    const trigger = screen.getByRole('button', {
      name: 'Explain Workflow interactions',
    });
    expect(trigger.closest('div')?.querySelector('h3')?.textContent).toBe(
      'Interactions',
    );
    expect(screen.getByText('Last interaction').querySelector('button')).toBe(
      null,
    );
    expect(screen.getByText('None').getAttribute('class')).toContain('text-xs');
  });
});
