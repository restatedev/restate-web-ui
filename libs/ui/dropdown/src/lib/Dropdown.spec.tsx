import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { Button } from '@restate/ui-button';
import { Dropdown } from './Dropdown';
import { DropdownItem } from './DropdownItem';
import { DropdownMenu } from './DropdownMenu';
import { DropdownPopover } from './DropdownPopover';
import { DropdownTrigger } from './DropdownTrigger';

function ActionsMenu({ onSelect }: { onSelect: (key: string) => void }) {
  return (
    <MemoryRouter>
      <Dropdown>
        <DropdownTrigger>
          <Button variant="secondary">Actions</Button>
        </DropdownTrigger>
        <DropdownPopover>
          <DropdownMenu onSelect={onSelect}>
            <DropdownItem value="pause">Pause…</DropdownItem>
            <DropdownItem value="cancel" destructive>
              Cancel…
            </DropdownItem>
          </DropdownMenu>
        </DropdownPopover>
      </Dropdown>
    </MemoryRouter>
  );
}

async function openWithKeyboard() {
  const user = userEvent.setup();
  await user.tab();
  await user.keyboard('{Enter}');
  return user;
}

describe('Dropdown', () => {
  it('opens from the keyboard on its first item', async () => {
    render(<ActionsMenu onSelect={vi.fn()} />);
    await openWithKeyboard();
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Pause…' }),
    );
  });

  it('moves with the arrow keys and selects with Enter', async () => {
    const onSelect = vi.fn();
    render(<ActionsMenu onSelect={onSelect} />);
    const user = await openWithKeyboard();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('cancel');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('closes on Escape and gives focus back to the trigger', async () => {
    render(<ActionsMenu onSelect={vi.fn()} />);
    const user = await openWithKeyboard();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Actions' }),
      ),
    );
  });
});
