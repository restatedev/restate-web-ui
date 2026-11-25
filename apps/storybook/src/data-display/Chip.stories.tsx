import type { Meta, StoryObj } from '@storybook/react-vite';
import { Chip, ChipGroup, ChipSegment } from '@restate/ui-chip';
import { Icon, IconName } from '@restate/ui-icons';

const meta = {
  title: 'Data display/Chip',
  component: Chip,
  args: { size: 'lg' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    left: { control: 'inline-radio', options: ['straight', 'angled'] },
    right: { control: 'inline-radio', options: ['straight', 'angled'] },
  },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Chip {...args}>
      <ChipSegment>
        <Icon name={IconName.Box} size="xs" />
        Checkout
      </ChipSegment>
    </Chip>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Chip key={size} size={size}>
          <ChipSegment>{size}</ChipSegment>
        </Chip>
      ))}
    </div>
  ),
};

export const Tones: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      {(['raised', 'subtle', 'muted'] as const).map((tone) => (
        <Chip key={tone} size="lg">
          <ChipSegment tone={tone}>{tone}</ChipSegment>
        </Chip>
      ))}
    </div>
  ),
};

export const Target: Story = {
  render: () => (
    <ChipGroup density="compact">
      <Chip left="straight" right="angled" size="lg">
        <ChipSegment tone="raised">
          <Icon name={IconName.Box} size="xs" />
          Checkout
        </ChipSegment>
      </Chip>
      <Chip left="angled" right="angled" size="lg">
        <ChipSegment tone="subtle">
          <Icon name={IconName.VirtualObject} size="xs" />
          cart-1042
        </ChipSegment>
      </Chip>
      <Chip left="angled" right="straight" size="lg">
        <ChipSegment tone="muted">process()</ChipSegment>
      </Chip>
    </ChipGroup>
  ),
};

export const Link: Story = {
  render: () => (
    <Chip size="lg" href="/services/Checkout" aria-label="Open Checkout">
      <ChipSegment tone="raised">
        <Icon name={IconName.Box} size="xs" />
        Checkout
      </ChipSegment>
    </Chip>
  ),
};
