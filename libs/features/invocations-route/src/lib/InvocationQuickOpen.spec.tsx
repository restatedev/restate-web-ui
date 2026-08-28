import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { InvocationQuickOpen } from './InvocationQuickOpen';

function QuickOpenHarness({ onOpen }: { onOpen: VoidFunction }) {
  const [invocationId, setInvocationId] = useState('');

  return (
    <MemoryRouter>
      <InvocationQuickOpen
        invocationId={invocationId}
        onChange={setInvocationId}
        onOpen={onOpen}
      />
    </MemoryRouter>
  );
}

describe('InvocationQuickOpen', () => {
  it('goes to an invocation ID from the keyboard form', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<QuickOpenHarness onOpen={onOpen} />);

    const invocationId = screen.getByRole('textbox', {
      name: 'Invocation ID',
    });
    const open = screen.getByRole('button', { name: 'Go to invocation' });

    expect(invocationId.closest('[data-chip-root]')?.className).toContain(
      'shadow-none',
    );
    expect(open.hasAttribute('disabled')).toBe(true);
    await user.type(invocationId, 'inv_123{Enter}');

    expect((invocationId as HTMLInputElement).value).toBe('inv_123');
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
