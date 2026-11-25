import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heading } from '@restate/ui-heading';

const meta = {
  title: 'Foundations/Heading',
  component: Heading,
  parameters: { layout: 'padded' },
  args: { level: 2, children: 'Restate UI Labs' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg', 'xl'] },
    tone: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'tertiary'],
    },
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Heading level={1} size="xl">
        Restate UI Labs
      </Heading>
      <Heading level={2} size="lg">
        process()
      </Heading>
      <Heading level={2}>No invocations found</Heading>
      <Heading level={3} size="sm">
        Limit rule
      </Heading>
      <Heading level={3} size="sm" tone="tertiary">
        No services
      </Heading>
    </div>
  ),
};
