import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '@restate/ui-badge';
import { Indicator } from '@restate/ui-loading';

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

export const Indicators: Story = {
  render: () => (
    <div className="flex items-center gap-4 text-sm text-secondary">
      <span className="flex items-center gap-2">
        <Indicator status="SUCCESS" /> Healthy
      </span>
      <span className="flex items-center gap-2">
        <Indicator status="INFO" /> Starting
      </span>
      <span className="flex items-center gap-2">
        <Indicator status="WARNING" /> Degraded
      </span>
      <span className="flex items-center gap-2">
        <Indicator status="DANGER" /> Down
      </span>
    </div>
  ),
};
