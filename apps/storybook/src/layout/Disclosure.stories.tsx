import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import {
  Disclosure,
  DisclosurePanel,
  DisclosureTrigger,
} from '@restate/ui-disclosure';
import { Callout } from '@restate/ui-callout';
import { ErrorBanner } from '@restate/ui-error';
import { Icon, IconName } from '@restate/ui-icons';

const meta = {
  title: 'Layout/Disclosure',
  component: Disclosure,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Disclosure>;

export default meta;
type Story = StoryObj<typeof meta>;

const error = new Error(
  'Failed to fetch http://localhost:9070/deployments: connection refused',
);

export const Ghost: Story = {
  render: () => (
    <div className="flex max-w-md flex-col items-center gap-3 text-center">
      <p className="text-sm text-secondary">Something went wrong.</p>
      <Disclosure className="flex w-full flex-col text-left">
        <DisclosureTrigger className="mx-auto">Error details</DisclosureTrigger>
        <DisclosurePanel className="mt-2">
          <ErrorBanner error={error} />
        </DisclosurePanel>
      </Disclosure>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Error details' }),
    );
    await expect(canvas.getByText(error.message)).toBeVisible();
  },
};

export const Inline: Story = {
  render: () => (
    <Disclosure className="flex max-w-md flex-col gap-2">
      <Callout intent="warning">
        No service is connected as checkout yet. Start it, then click Add again.{' '}
        <DisclosureTrigger variant="inline">Error details</DisclosureTrigger>
      </Callout>
      <DisclosurePanel>
        <ErrorBanner error={error} />
      </DisclosurePanel>
    </Disclosure>
  ),
};

export const Row: Story = {
  render: () => (
    <Disclosure
      defaultOpen
      className="max-w-md rounded-xl border bg-inset p-0.5"
    >
      <div className="relative flex items-center gap-2 rounded-[calc(0.75rem-0.125rem)] border bg-surface p-3 text-sm shadow-xs">
        <DisclosureTrigger variant="row" aria-label="Checkout" />
        <Icon name={IconName.Box} size="md" tone="muted" />
        <span className="font-medium">Checkout</span>
      </div>
      <DisclosurePanel animated className="px-3 py-2 text-xs text-muted">
        process, notify, cancel
      </DisclosurePanel>
    </Disclosure>
  ),
};
