import type { Meta, StoryObj } from '@storybook/react-vite';
import { ErrorBanner, InlineError } from '@restate/ui-error';

const meta = {
  title: 'Feedback/Errors',
  component: ErrorBanner,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ErrorBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Banner: Story = {
  args: {
    error: new Error(
      'The deployment at http://localhost:9080 is not reachable.',
    ),
  },
};

export const BannerWithSeveral: Story = {
  args: {
    errors: ['The service name is required.', 'The handler name is required.'],
  },
};

export const Transient: Story = {
  args: {
    error: new Error('Lost the connection to the server. Retrying…'),
    isTransient: true,
  },
};

export const Inline: Story = {
  render: () => <InlineError>Couldn't load the journal.</InlineError>,
};
