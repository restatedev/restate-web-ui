import type { Meta, StoryObj } from '@storybook/react-vite';
import { Chip, ChipGroup, ChipSegment } from '@restate/ui-chip';
import { Code } from '@restate/ui-code';
import { ActionText } from '@restate/ui-action-text';
import { Icon, IconName } from '@restate/ui-icons';

const meta = {
  title: 'Data display/Chip',
  component: Chip,
  args: { children: 'Checkout' },
  argTypes: { size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] } },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Chip {...args} size="sm">
        sm
      </Chip>
      <Chip {...args} size="md">
        md
      </Chip>
      <Chip {...args} size="lg">
        lg
      </Chip>
    </div>
  ),
};

export const Group: Story = {
  render: () => (
    <ChipGroup aria-label="Target">
      <ChipSegment>
        <Icon name={IconName.Box} className="h-3 w-3" />
        Checkout
      </ChipSegment>
      <ChipSegment tone="subtle">process</ChipSegment>
    </ChipGroup>
  ),
};

export const InlineCode: Story = {
  render: () => (
    <p className="text-sm text-secondary">
      Run <Code>restate deployments list</Code> to see every deployment.
    </p>
  ),
};

export const Action: Story = {
  render: () => (
    <span className="text-sm text-secondary">
      <ActionText>Restart as new</ActionText>
    </span>
  ),
};
