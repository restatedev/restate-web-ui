import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Radio, RadioGroup } from 'react-aria-components';
import { describe, expect, it } from 'vitest';
import { RadioTooltipTrigger } from './RadioTooltipTrigger';
import { Tooltip } from './Tooltip';
import { TooltipContent } from './TooltipContent';

function renderRadio({ isDisabled }: { isDisabled: boolean }) {
  render(
    <RadioGroup aria-label="Plan">
      <Tooltip>
        <RadioTooltipTrigger>
          <Radio value="free" isDisabled={isDisabled}>
            Free
          </Radio>
        </RadioTooltipTrigger>
        <TooltipContent>Free plan details</TooltipContent>
      </Tooltip>
    </RadioGroup>,
  );
  return screen.getByText('Free');
}

describe('RadioTooltipTrigger', () => {
  it.each([false, true])(
    'opens on hover and closes on leave (disabled: %s)',
    async (isDisabled) => {
      const user = userEvent.setup();
      const label = renderRadio({ isDisabled });

      await user.hover(label);
      expect((await screen.findByRole('tooltip')).textContent).toBe(
        'Free plan details',
      );

      await user.unhover(label);
      await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull(), {
        timeout: 2000,
      });
    },
  );
});
