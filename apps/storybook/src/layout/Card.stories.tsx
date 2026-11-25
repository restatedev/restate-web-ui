import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Card,
  CardGrid,
  CardHeader,
  CardHeaderLink,
  CardHeroValue,
  CardLinkRow,
  CardRow,
} from '@restate/ui-card';
import { IconName } from '@restate/ui-icons';

const meta = {
  title: 'Layout/Card',
  component: Card,
  parameters: { layout: 'padded' },
  argTypes: {
    intent: {
      control: 'inline-radio',
      options: [
        'none',
        'neutral',
        'info',
        'success',
        'warning',
        'danger',
        'pending',
      ],
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

const narrow: Story['decorators'] = [
  (Story) => (
    <div className="max-w-sm">
      <Story />
    </div>
  ),
];

export const Default: Story = {
  decorators: narrow,
  render: (args) => (
    <Card {...args}>
      <CardHeader title="Retry policy" icon={IconName.Retry} />
      <CardRow label="Attempts">70, then pause</CardRow>
      <CardRow label="Backoff">500 ms – 1 min</CardRow>
      <CardLinkRow href="/services/Checkout" label="Service">
        Checkout
      </CardLinkRow>
    </Card>
  ),
};

export const Hero: Story = {
  decorators: narrow,
  render: (args) => (
    <Card {...args}>
      <CardHeader
        title="State"
        icon={IconName.Database}
        action={<CardHeaderLink href="/state">State</CardHeaderLink>}
      />
      <CardRow variant="hero" label="Keys">
        <CardHeroValue>41</CardHeroValue>
      </CardRow>
      <CardRow label="Total value size">2.24 KiB</CardRow>
    </Card>
  ),
};

export const Warning: Story = {
  decorators: narrow,
  args: { intent: 'warning' },
  render: (args) => (
    <Card {...args}>
      <CardHeader title="Details" icon={IconName.Info} />
      <CardRow label="SDK">typescript 1.2.0</CardRow>
      <CardRow label="Endpoint">http://localhost:9080</CardRow>
    </Card>
  ),
};

export const Grid: Story = {
  render: () => (
    <CardGrid columns={2}>
      {(['info', 'success', 'warning', 'danger'] as const).map((intent) => (
        <Card key={intent} intent={intent}>
          <CardHeader title={intent} icon={IconName.Invocation} />
          <CardRow label="Invocations">1,204</CardRow>
        </Card>
      ))}
    </CardGrid>
  ),
};
