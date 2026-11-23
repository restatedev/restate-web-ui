import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  NotificationRegion,
  showErrorNotification,
  showInfoNotification,
  showSuccessNotification,
  showWarningNotification,
} from '@restate/ui-notification';
import { Button } from '@restate/ui-button';

const meta = {
  title: 'Feedback/Notifications',
  component: NotificationRegion,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof NotificationRegion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Types: Story = {
  render: () => (
    <div className="flex min-h-80 flex-wrap items-start gap-2 p-6">
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
      <NotificationRegion />
    </div>
  ),
};
