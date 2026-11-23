import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconName } from '@restate/ui-icons';
import { Ellipsis, Skeleton, Spinner, StatusDot } from '@restate/ui-loading';

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

export const Skeletons: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-4 text-sm text-secondary">
      {(
        [
          ['text', 'h-3 w-24'],
          ['pill', 'h-5 w-16'],
          ['block', 'h-9 w-full'],
          ['card', 'min-h-28 w-full'],
        ] as const
      ).map(([shape, size]) => (
        <div key={shape} className="flex flex-col gap-1.5">
          <code className="font-mono text-2xs text-tertiary">{shape}</code>
          <Skeleton shape={shape} className={size} />
        </div>
      ))}
    </div>
  ),
};
