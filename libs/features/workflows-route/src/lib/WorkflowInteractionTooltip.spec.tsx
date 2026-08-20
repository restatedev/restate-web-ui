import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { WorkflowInteractionTooltip } from './WorkflowInteractionTooltip';

afterEach(() => {
  vi.useRealTimers();
});

describe('WorkflowInteractionTooltip', () => {
  it('defines interactions beside a tab without nesting a button', async () => {
    vi.useFakeTimers();
    render(
      <WorkflowInteractionTooltip variant="tab">
        Interactions
      </WorkflowInteractionTooltip>,
    );

    const indicator = screen.getByRole('img', {
      name: 'About Workflow interactions',
    });
    expect(screen.queryByRole('button')).toBeNull();

    fireEvent.mouseEnter(indicator.parentElement!);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(251);
    });

    expect(screen.getByRole('tooltip').textContent).toContain(
      'Interactions are invocations of handlers other than the run handler. They are commonly used to query or signal a Workflow while its execution is running or retained.',
    );
  });
});
