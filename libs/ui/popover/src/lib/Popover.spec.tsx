import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@restate/ui-button';
import { Popover } from './Popover';
import { PopoverContent } from './PopoverContent';
import { PopoverTrigger } from './PopoverTrigger';

function RetryPolicy() {
  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="secondary">Retry policy</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div>70 attempts, then pause</div>
      </PopoverContent>
    </Popover>
  );
}

describe('Popover', () => {
  it('opens on press with its content', async () => {
    const user = userEvent.setup();
    render(<RetryPolicy />);
    await user.click(screen.getByRole('button', { name: 'Retry policy' }));
    expect(screen.getByRole('dialog').textContent).toContain(
      '70 attempts, then pause',
    );
  });

  it('closes on Escape and gives focus back to the trigger', async () => {
    const user = userEvent.setup();
    render(<RetryPolicy />);
    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog')).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Retry policy' }),
      ),
    );
  });
});
