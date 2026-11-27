import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@restate/ui-button';
import { Dialog } from './Dialog';
import { DialogClose } from './DialogClose';
import { DialogContent } from './DialogContent';
import { DialogFooter } from './DialogFooter';
import { DialogTitle } from './DialogTitle';
import { DialogTrigger } from './DialogTrigger';

function RegisterDialog({ isDismissable }: { isDismissable?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="secondary">Register deployment</Button>
      </DialogTrigger>
      <DialogContent isDismissable={isDismissable}>
        <DialogTitle>Register deployment</DialogTitle>
        <DialogFooter>
          <DialogClose>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function open() {
  const user = userEvent.setup();
  const trigger = screen.getByRole('button', { name: 'Register deployment' });
  await user.click(trigger);
  return { user };
}

describe('Dialog', () => {
  it('opens from its trigger, named by its title', async () => {
    render(<RegisterDialog />);
    await open();
    expect(
      screen.getByRole('dialog', { name: 'Register deployment' }),
    ).toBeTruthy();
  });

  it('closes on Escape and gives focus back to the trigger', async () => {
    const user = userEvent.setup();
    render(<RegisterDialog />);
    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog')).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Register deployment' }),
      ),
    );
  });

  it('closes from DialogClose', async () => {
    render(<RegisterDialog />);
    const { user } = await open();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('closes on a backdrop click', async () => {
    render(<RegisterDialog />);
    const { user } = await open();
    await user.click(document.body);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('stays open on a backdrop click when not dismissable', async () => {
    render(<RegisterDialog isDismissable={false} />);
    const { user } = await open();
    await user.click(document.body);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
