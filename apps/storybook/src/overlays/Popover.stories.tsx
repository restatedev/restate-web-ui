import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui-popover';
import { Button } from '@restate/ui-button';

const meta = {
  title: 'Overlays/Popover',
  component: Popover,
  parameters: { docs: { story: { inline: false, height: '320px' } } },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: null },
  render: () => (
    <Popover>
      <PopoverTrigger>
        <Button variant="secondary">Retry policy</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="flex max-w-xs flex-col gap-1 p-3 text-sm">
          <span className="font-medium text-primary">
            70 attempts, then pause
          </span>
          <span className="text-muted">
            Backoff grows from 500 ms to 1 min between attempts.
          </span>
        </div>
      </PopoverContent>
    </Popover>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
  },
};
