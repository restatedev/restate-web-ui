import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import {
  HoverTooltip,
  InlineTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TruncateWithTooltip,
} from '@restate/ui-tooltip';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';

const meta = {
  title: 'Overlays/Tooltip',
  component: Tooltip,
  parameters: { docs: { story: { inline: false, height: '200px' } } },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnIconButton: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger>
        <Button variant="icon" aria-label="Refresh">
          <Icon name={IconName.Retry} size="md" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Refresh</TooltipContent>
    </Tooltip>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.hover(canvasElement);
    await userEvent.hover(within(canvasElement).getByRole('button'));
  },
};

export const HoverNote: Story = {
  render: () => (
    <p className="max-w-sm text-sm text-secondary">
      The invocation is{' '}
      <InlineTooltip
        title="Suspended"
        description="It waits for a result from another invocation or a timer and uses no resources meanwhile."
        learnMoreHref="https://docs.restate.dev"
      >
        suspended
      </InlineTooltip>{' '}
      until the payment is confirmed.
    </p>
  ),
};

export const OnText: Story = {
  render: () => (
    <HoverTooltip content="Created 4 days 22 hours ago">
      <span className="text-sm text-secondary">4d 22h ago</span>
    </HoverTooltip>
  ),
};

export const Truncated: Story = {
  render: () => (
    <div className="w-56 text-sm text-primary">
      <TruncateWithTooltip copyText="inv_1gQNFQQ1HLWM7jo57gxCUiOlQ5nBYztfXV">
        inv_1gQNFQQ1HLWM7jo57gxCUiOlQ5nBYztfXV
      </TruncateWithTooltip>
    </div>
  ),
};
