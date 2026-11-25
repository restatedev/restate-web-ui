import type { Meta, StoryObj } from '@storybook/react-vite';
import { MetricComparison } from '@restate/ui-metric-comparison';

const meta = {
  title: 'Data display/MetricComparison',
  component: MetricComparison,
  args: {
    value: '1.8 s',
    ratio: 2.4,
    average: '750 ms',
    label: 'Queue wait',
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['xs', 'sm'] },
  },
} satisfies Meta<typeof MetricComparison>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Tones: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-2">
      <MetricComparison value="180 ms" ratio={0.4} label="Queue wait" />
      <MetricComparison value="760 ms" ratio={1} label="Queue wait" />
      <MetricComparison value="1.1 s" ratio={1.4} label="Queue wait" />
      <MetricComparison value="1.8 s" ratio={2.4} label="Queue wait" />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-2">
      <MetricComparison
        value="1.8 s"
        ratio={2.4}
        label="Queue wait"
        size="sm"
      />
      <MetricComparison
        value="1.8 s"
        ratio={2.4}
        label="Queue wait"
        size="xs"
      />
    </div>
  ),
};

export const WithoutRatio: Story = {
  args: { ratio: undefined, average: undefined },
};

export const Live: Story = {
  args: { value: '4.2 s', qualifier: 'so far', ratio: 5.6 },
};

export const BadgeOnly: Story = {
  args: { showValue: false, decorative: true },
};

export const InQueueSummary: Story = {
  render: () => (
    <div className="flex min-w-0 items-baseline gap-x-1.5 overflow-hidden text-xs whitespace-nowrap">
      <span className="font-medium text-muted">Queued</span>
      <span className="font-normal text-subtle">for</span>
      <MetricComparison
        value="1.8 s"
        ratio={2.4}
        average="750 ms"
        label="Queue wait"
      />
    </div>
  ),
};

export const InLifecycleSummary: Story = {
  render: () => (
    <span className="inline-flex min-w-0 items-baseline gap-1.5 text-xs whitespace-nowrap">
      <span className="font-normal text-subtle">has taken</span>{' '}
      <MetricComparison
        value="12.4 s"
        qualifier="so far"
        ratio={1.3}
        label="Lifecycle duration"
      />
    </span>
  ),
};
