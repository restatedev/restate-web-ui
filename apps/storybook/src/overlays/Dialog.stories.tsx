import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { userEvent, within } from 'storybook/test';
import {
  ConfirmationDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from '@restate/ui-dialog';
import { Button } from '@restate/ui-button';
import { FormFieldInput } from '@restate/ui-form-field';
import { IconName } from '@restate/ui-icons';

const meta = {
  title: 'Overlays/Dialog',
  component: Dialog,
  parameters: { docs: { story: { inline: false, height: '520px' } } },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const openTrigger: Story['play'] = async ({ canvasElement }) => {
  await userEvent.click(within(canvasElement).getByRole('button'));
};

export const Form: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger>
        <Button variant="secondary">Register deployment</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <div className="flex flex-col gap-2">
          <h3
            slot="title"
            className="text-lg leading-6 font-medium text-primary"
          >
            Register deployment
          </h3>
          <p className="text-sm text-muted">
            Point Restate at the endpoint that serves your handlers.
          </p>
          <FormFieldInput
            name="uri"
            label="Endpoint"
            placeholder="http://localhost:9080"
            required
          />
        </div>
        <DialogFooter>
          <div className="flex gap-2">
            <DialogClose>
              <Button variant="secondary" className="flex-auto">
                Cancel
              </Button>
            </DialogClose>
            <Button className="flex-auto">Register</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: openTrigger,
};

function ConfirmationExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Cancel…
      </Button>
      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title="Cancel invocation"
        icon={IconName.Cancel}
        description="Are you sure you want to cancel this invocation?"
        alertType="info"
        alertContent="Cancellation frees held resources and lets your handler roll back its changes."
        submitText="Cancel invocation"
        submitVariant="destructive"
        onSubmit={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
      />
    </>
  );
}

export const Confirmation: Story = {
  render: () => <ConfirmationExample />,
  play: openTrigger,
};
