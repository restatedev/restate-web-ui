import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import {
  HintTooltip,
  HoverTooltip,
  InlineTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TruncateWithTooltip,
} from '@restate/ui-tooltip';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';

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

export const HintOnLink: Story = {
  render: () => (
    <ul className="flex w-44 flex-col gap-1.5 text-sm">
      {[
        {
          label: 'In-flight',
          hint: 'Not finished yet: running, held up or suspended',
        },
        { label: 'Held up', hint: 'Waiting to start, retry or resume' },
        { label: 'All' },
      ].map((item) => (
        <li key={item.label} className="flex">
          <HintTooltip hint={item.hint} placement="right" offset={12}>
            <Link href={`#${item.label}`} variant="secondary">
              {item.label}
            </Link>
          </HintTooltip>
        </li>
      ))}
    </ul>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.hover(canvasElement);
    await userEvent.hover(within(canvasElement).getByText('Held up'));
    await within(document.body).findByText(
      'Waiting to start, retry or resume',
      undefined,
      { timeout: 3000 },
    );
  },
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
