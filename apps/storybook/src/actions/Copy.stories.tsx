import type { Meta, StoryObj } from '@storybook/react-vite';
import { Copy } from '@restate/ui-copy';

const meta = {
  title: 'Actions/Copy',
  component: Copy,
  args: { copyText: 'inv_1gQNFQQ1HLWM7jo57gxCUiOlQ5nBYztfXV', size: 'xs' },
  argTypes: { size: { control: 'inline-radio', options: ['xs', 'sm', 'md'] } },
} satisfies Meta<typeof Copy>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-4">
      {(['xs', 'sm', 'md'] as const).map((size) => (
        <Copy key={size} {...args} size={size} />
      ))}
    </div>
  ),
};

export const NextToAValue: Story = {
  render: (args) => (
    <span className="flex items-center gap-1 font-mono text-xs text-secondary">
      {args.copyText}
      <Copy {...args} size="xs" />
    </span>
  ),
};
