import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { WorkflowQuickOpen } from './WorkflowQuickOpen';
import type { WorkflowOpenDraft } from './workflows.open';

function QuickOpenHarness({ onOpen }: { onOpen: VoidFunction }) {
  const [draft, setDraft] = useState<WorkflowOpenDraft>({
    id: '',
    scope: '',
  });

  return (
    <MemoryRouter>
      <WorkflowQuickOpen
        draft={draft}
        disabled={false}
        hasScope
        onChange={setDraft}
        onOpen={onOpen}
        service="OrderWorkflow"
      />
    </MemoryRouter>
  );
}

describe('WorkflowQuickOpen', () => {
  it('goes to the inline scope and workflow identity from the keyboard form', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<QuickOpenHarness onOpen={onOpen} />);

    const scope = screen.getByRole('textbox', { name: 'Scope (optional)' });
    const workflowId = screen.getByRole('textbox', { name: 'Workflow ID' });
    const open = screen.getByRole('button', { name: 'Go to run' });

    expect(open.hasAttribute('disabled')).toBe(true);
    await user.type(scope, 'orders');
    await user.type(workflowId, 'order-42{Enter}');

    expect((scope as HTMLInputElement).value).toBe('orders');
    expect((workflowId as HTMLInputElement).value).toBe('order-42');
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
