import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '@restate/ui-badge';

const meta = {
  title: 'Feedback/Badge',
  component: Badge,
  args: { children: 'Running' },
  argTypes: {
    intent: {
      control: 'inline-radio',
      options: ['neutral', 'info', 'success', 'warning', 'danger'],
    },
    size: { control: 'inline-radio', options: ['xs', 'sm', 'md'] },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Intents: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge {...args} intent="neutral">
        Neutral
      </Badge>
      <Badge {...args} intent="info">
        Info
      </Badge>
      <Badge {...args} intent="success">
        Succeeded
      </Badge>
      <Badge {...args} intent="warning">
        Paused
      </Badge>
      <Badge {...args} intent="danger">
        Failed
      </Badge>
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge {...args} size="xs">
        xs
      </Badge>
      <Badge {...args} size="sm">
        sm
      </Badge>
      <Badge {...args} size="md">
        md
      </Badge>
    </div>
  ),
};
