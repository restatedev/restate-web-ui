import type { Meta, StoryObj } from '@storybook/react-vite';
import { Callout } from '@restate/ui-callout';
import { Link } from '@restate/ui-link';

const meta = {
  title: 'Feedback/Callout',
  component: Callout,
  parameters: { layout: 'padded' },
  args: {
    intent: 'warning',
    children:
      'Any changes made here are temporary and remain in effect only until the service is next discovered and registered.',
  },
  argTypes: {
    intent: {
      control: 'inline-radio',
      options: ['info', 'success', 'warning', 'danger'],
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Callout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Intents: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      <Callout {...args} intent="info">
        Cancellation frees held resources and lets your handler roll back its
        changes.
      </Callout>
      <Callout {...args} intent="success">
        The deployment is registered and serves 3 services.
      </Callout>
      <Callout {...args} intent="warning">
        This might break in-flight invocations, use with caution.
      </Callout>
      <Callout {...args} intent="danger">
        All state for this key will be deleted.
      </Callout>
    </div>
  ),
};

export const WithTitle: Story = {
  args: {
    title: 'Outdated SDK version',
    children: (
      <>
        This deployment uses Service Protocol 1, which upcoming releases will
        not support. Upgrade the SDK and register the deployment again.{' '}
        <Link href="https://docs.restate.dev" target="_blank">
          Learn more
        </Link>
      </>
    ),
  },
};

export const Pending: Story = {
  args: {
    intent: 'info',
    isPending: true,
    children:
      'This mutation will be enqueued to be processed after any active invocations on this key.',
  },
};
