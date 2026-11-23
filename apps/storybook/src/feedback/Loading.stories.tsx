import type { Meta, StoryObj } from '@storybook/react-vite';
import { Ellipsis, Spinner } from '@restate/ui-loading';

const meta = {
  title: 'Feedback/Loading',
  component: Spinner,
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SpinnerDefault: Story = { name: 'Spinner' };

export const SpinnerInText: Story = {
  render: () => (
    <span className="flex items-center gap-2 text-sm text-secondary">
      <Spinner className="h-4 w-4" />
      Loading deployments
    </span>
  ),
};

export const TypingEllipsis: Story = {
  render: () => (
    <span className="text-sm text-secondary">
      <Ellipsis>Waiting for the result</Ellipsis>
    </span>
  ),
};
