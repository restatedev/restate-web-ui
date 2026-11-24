import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '@restate/ui-badge';
import { Copy } from '@restate/ui-copy';

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
    mono: { control: 'boolean' },
    borderless: { control: 'boolean' },
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

export const MonoAndBorderless: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge {...args} size="sm" mono className="min-w-0 py-0 pr-0">
        <span className="truncate">dp_17fXq0bsK2C6pq3U0Sgb9VY</span>
        <Copy
          copyText="dp_17fXq0bsK2C6pq3U0Sgb9VY"
          size="2xs"
          className="ml-1"
        />
      </Badge>
      <Badge {...args} size="sm" mono>
        v1.8.1
      </Badge>
      <Badge {...args} borderless>
        Ingress
      </Badge>
      <Badge {...args} borderless>
        Subscription
      </Badge>
    </div>
  ),
};
