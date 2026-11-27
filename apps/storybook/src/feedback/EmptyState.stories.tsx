import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmptyState } from '@restate/ui-empty-state';
import { IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';

const meta = {
  title: 'Feedback/EmptyState',
  component: EmptyState,
  parameters: { layout: 'padded' },
  args: {
    icon: IconName.Invocation,
    title: 'No invocations found',
    description:
      'No invocations match the current filters. Try adjusting or clearing them.',
  },
  argTypes: {
    intent: {
      control: 'inline-radio',
      options: ['neutral', 'info', 'success', 'warning', 'danger'],
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    icon: IconName.Box,
    title: 'Deployments · 0',
    description: 'Register a deployment to see its services here.',
    children: (
      <Link href="/deployments?register" variant="button">
        Register deployment
      </Link>
    ),
  },
};

export const Danger: Story = {
  args: {
    intent: 'danger',
    icon: IconName.CircleX,
    title: "Couldn't load services",
    description: 'The server did not answer. Check that it is running.',
  },
};
