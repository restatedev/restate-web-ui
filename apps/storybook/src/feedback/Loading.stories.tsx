import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconName } from '@restate/ui-icons';
import { Ellipsis, Spinner, StatusDot } from '@restate/ui-loading';

const meta = {
  title: 'Feedback/Loading',
  component: Spinner,
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SpinnerDefault: Story = { name: 'Spinner' };

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-6 text-secondary">
      {(['xs', 'sm', 'md', 'lg'] as const).map((size) => (
        <span key={size} className="flex flex-col items-center gap-2">
          <Spinner size={size} />
          <code className="font-mono text-2xs text-tertiary">{size}</code>
        </span>
      ))}
    </div>
  ),
};

export const SpinnerInText: Story = {
  render: () => (
    <span className="flex items-center gap-2 text-sm text-secondary">
      <Spinner size="md" />
      Loading deployments
    </span>
  ),
};

export const WithLabel: Story = {
  render: () => <Spinner size="md" label="Loading deployments" />,
};

export const TypingEllipsis: Story = {
  render: () => (
    <span className="text-sm text-secondary">
      <Ellipsis>Waiting for the result</Ellipsis>
    </span>
  ),
};

export const StatusDots: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4 text-sm text-secondary">
      {(
        ['neutral', 'info', 'success', 'warning', 'danger', 'pending'] as const
      ).map((intent) => (
        <span key={intent} className="flex items-center gap-2">
          <StatusDot intent={intent} pulse />
          {intent}
        </span>
      ))}
    </div>
  ),
};

export const StatusDotWithIcon: Story = {
  render: () => (
    <span className="flex items-center gap-2 text-sm text-secondary">
      <StatusDot intent="pending" icon={IconName.TriangleAlert} pulse />
      Degraded
    </span>
  ),
};
