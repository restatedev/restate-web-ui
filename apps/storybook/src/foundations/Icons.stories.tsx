import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon, ICON_NAMES, IconName } from '@restate/ui-icons';

const meta = {
  title: 'Foundations/Icons',
  component: Icon,
  parameters: { layout: 'padded' },
  args: { name: IconName.Invocation },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = {
  render: () => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
      {ICON_NAMES.map((name) => (
        <div
          key={name}
          className="flex flex-col items-center gap-2 rounded-xl border border-default bg-surface px-2 py-3 text-primary"
        >
          <Icon name={name} size="lg" />
          <span className="font-mono text-2xs text-tertiary">{name}</span>
        </div>
      ))}
    </div>
  ),
};

export const FollowsFontSize: Story = {
  render: (args) => (
    <div className="flex items-end gap-6 text-primary">
      {(['text-xs', 'text-sm', 'text-base', 'text-lg'] as const).map((size) => (
        <span key={size} className={size}>
          <span className="flex items-center gap-1">
            <Icon {...args} />
            {size}
          </span>
        </span>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-end gap-6 text-primary">
      {(['xs', 'sm', 'md', 'lg'] as const).map((size) => (
        <span key={size} className="flex flex-col items-center gap-2">
          <Icon {...args} size={size} />
          <code className="font-mono text-2xs text-tertiary">{size}</code>
        </span>
      ))}
    </div>
  ),
};
