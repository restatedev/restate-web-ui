import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@restate/ui-button';
import { HoverTooltip } from './HoverTooltip';
import { Tooltip } from './Tooltip';
import { TooltipContent } from './TooltipContent';
import { TooltipTrigger } from './TooltipTrigger';

describe('Tooltip', () => {
  it('opens on keyboard focus and closes on Escape', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip>
        <TooltipTrigger>
          <Button variant="secondary">Retry now</Button>
        </TooltipTrigger>
        <TooltipContent>Runs the next attempt without waiting</TooltipContent>
      </Tooltip>,
    );
    await user.tab();
    expect(screen.getByRole('tooltip').textContent).toContain(
      'Runs the next attempt without waiting',
    );
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });
});

describe('HoverTooltip', () => {
  it('does not open on keyboard focus', async () => {
    const user = userEvent.setup();
    render(
      <HoverTooltip content="Introspect">
        <Button variant="secondary">Open SQL</Button>
      </HoverTooltip>,
    );
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Open SQL' }),
    );
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
