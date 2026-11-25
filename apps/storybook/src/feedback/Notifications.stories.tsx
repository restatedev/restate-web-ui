import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  NOTIFICATION_ZONE_ID,
  NotificationRegion,
  showErrorNotification,
  showInfoNotification,
  showSuccessNotification,
  showWarningNotification,
} from '@restate/ui-notification';
import { Button } from '@restate/ui-button';
import { userEvent, within } from 'storybook/test';

const meta = {
  title: 'Feedback/Notifications',
  component: NotificationRegion,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof NotificationRegion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Types: Story = {
  render: () => (
    <div className="min-h-80 p-6">
      <div
        id={NOTIFICATION_ZONE_ID}
        className="sticky top-3 z-110 mx-auto h-0 w-full max-w-4xl"
      />
      <NotificationRegion />
      <div className="flex flex-wrap items-start gap-2 pt-24">
        <Button
          variant="secondary"
          onClick={() =>
            showSuccessNotification('The deployment has been registered.')
          }
        >
          Success
        </Button>
        <Button
          variant="secondary"
          onClick={() => showInfoNotification('The invocation was cancelled.')}
        >
          Info
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            showWarningNotification('The server answers slowly right now.')
          }
        >
          Warning
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            showErrorNotification("Couldn't register the deployment.")
          }
        >
          Error
        </Button>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'Warning' }),
    );
  },
};
