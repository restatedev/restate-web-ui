import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { ErrorBanner, InlineError } from '@restate/ui-error';
import { RestateError } from '@restate/util-errors';

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

export const RestateErrorWithDetails: Story = {
  args: {
    error: new RestateError(
      'Failed to invoke the handler: the deployment answered 503 Service Unavailable.',
      'RT0010',
      false,
      undefined,
      undefined,
      undefined,
      [
        { key: 'deployment', value: 'dp_16SYzZL6LG4bkox94Wgq425' },
        {
          key: 'response body',
          value:
            'upstream connect error or disconnect/reset before headers.\nreset reason: connection termination\nretried 3 times over 1.2s',
        },
      ],
    ),
  },
};

export const RestateErrorDetailsOpen: Story = {
  args: RestateErrorWithDetails.args,
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole('button', {
        name: /response body/,
      }),
    );
  },
};
