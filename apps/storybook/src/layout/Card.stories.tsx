import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Card,
  CardGrid,
  CardHeader,
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
        'default',
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

export const Default: Story = {
  render: (args) => (
    <div className="max-w-sm">
      <Card {...args}>
        <CardHeader title="Retry policy" icon={IconName.Retry} />
        <CardRow label="Attempts">70, then pause</CardRow>
        <CardRow label="Backoff">500 ms – 1 min</CardRow>
        <CardLinkRow href="/services/Checkout" label="Service">
          Checkout
        </CardLinkRow>
      </Card>
    </div>
  ),
};

export const Hero: Story = {
  render: (args) => (
    <div className="max-w-sm">
      <Card {...args} intent="warning">
        <CardHeader title="Paused" icon={IconName.Pause} />
        <CardRow variant="hero">
          <CardHeroValue>83</CardHeroValue>
        </CardRow>
        <CardRow label="Oldest">4d 22h ago</CardRow>
      </Card>
    </div>
  ),
};

export const Grid: Story = {
  render: () => (
    <CardGrid columns={3}>
      {(['info', 'success', 'danger'] as const).map((intent) => (
        <Card key={intent} intent={intent}>
          <CardHeader title={intent} icon={IconName.Invocation} />
          <CardRow label="Invocations">1,204</CardRow>
        </Card>
      ))}
    </CardGrid>
  ),
};
