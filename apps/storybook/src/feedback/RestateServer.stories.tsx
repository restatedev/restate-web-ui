import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import {
  RestateServer,
  type FerrofluidStatus,
} from '@restate/ui-restate-server';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';

const STATUSES: FerrofluidStatus[] = [
  'idle',
  'active',
  'pause',
  'warning',
  'danger',
];

const meta = {
  title: 'Feedback/Restate server',
  component: RestateServer,
  args: {
    status: 'idle',
    appearance: 'solid',
    onPress: fn(),
    'aria-label': 'Refresh',
  },
  argTypes: {
    status: { control: 'inline-radio', options: STATUSES },
    appearance: { control: 'inline-radio', options: ['ghost', 'solid'] },
    aura: { control: 'inline-radio', options: ['subtle', 'prominent'] },
  },
} satisfies Meta<typeof RestateServer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Statuses: Story = {
  render: (args) => (
    <div className="flex flex-wrap justify-center gap-6">
      {STATUSES.map((status) => (
        <div key={status} className="flex flex-col items-center gap-1">
          <RestateServer {...args} status={status} />
          <span className="text-xs text-muted">{status}</span>
        </div>
      ))}
    </div>
  ),
};

export const Hero: Story = {
  args: { status: 'active' },
  render: (args) => (
    <div className="relative z-20 h-[92px] w-[92px]">
      <div className="absolute top-1/2 left-1/2 -translate-1/2 scale-[0.7]">
        <RestateServer {...args} />
      </div>
    </div>
  ),
};

export const Ghost: Story = {
  args: { appearance: 'ghost', isEmpty: true },
  render: (args) => (
    <RestateServer
      {...args}
      className="flex h-auto min-h-[132px] flex-col items-center"
    />
  ),
};

export const EmptyState: Story = {
  parameters: {
    layout: 'padded',
    docs: { story: { inline: false, height: '560px' } },
  },
  args: { status: 'idle', isEmpty: true },
  decorators: [
    (Story) => (
      <div className="flex min-h-[30rem] max-w-3xl flex-col">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <RestateServer
      {...args}
      className="flex w-full flex-auto flex-col items-center justify-center overflow-hidden rounded-xl border bg-inset pt-24 pb-8 shadow-[inset_0_1px_2px_0px_var(--box-shadow-color-inset)] ring-1 ring-surface/80 @tall:pt-10 @tall:pb-40"
    >
      <div className="relative mt-6 flex w-full flex-col items-center gap-2 text-center">
        <div className="flex min-h-5 items-center justify-center">
          <h3 className="text-sm font-semibold text-tertiary">
            No service deployments
          </h3>
        </div>
        <p className="max-w-md px-4 text-sm text-muted">
          Point Restate to your deployed services so Restate can register your
          services and handlers
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            variant="secondary-button"
            href="?register=true"
            className="flex items-center gap-2 px-3"
          >
            <Icon name={IconName.Plus} size="md" />
            Register deployment
          </Link>
        </div>
      </div>
    </RestateServer>
  ),
};

export const Aura: Story = {
  args: { status: 'active', aura: 'prominent' },
  decorators: [
    (Story) => (
      <div className="p-32">
        <Story />
      </div>
    ),
  ],
};
