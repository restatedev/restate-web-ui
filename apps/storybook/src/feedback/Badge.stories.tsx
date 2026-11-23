import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '@restate/ui-badge';
import { Indicator } from '@restate/ui-loading';

const meta = {
  title: 'Feedback/Badge',
  component: Badge,
  args: { children: 'Running' },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['default', 'info', 'success', 'warning', 'danger'],
    },
    size: { control: 'inline-radio', options: ['xs', 'sm', 'base'] },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge {...args} variant="default">
        Default
      </Badge>
      <Badge {...args} variant="info">
        Info
      </Badge>
      <Badge {...args} variant="success">
        Succeeded
      </Badge>
      <Badge {...args} variant="warning">
        Paused
      </Badge>
      <Badge {...args} variant="danger">
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
      <Badge {...args} size="base">
        base
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
