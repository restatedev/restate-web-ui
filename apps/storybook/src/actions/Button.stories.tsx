import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Button, SubmitButton } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';

const meta = {
  title: 'Actions/Button',
  component: Button,
  args: { children: 'Register deployment', onClick: fn() },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'destructive', 'icon'],
    },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: 'primary' } };

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Cancel' },
};

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Kill invocation' },
};

export const Disabled: Story = { args: { disabled: true } };

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} variant="primary">
        Primary
      </Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="destructive">
        Destructive
      </Button>
      <Button {...args} variant="icon" aria-label="Refresh">
        <Icon name={IconName.Retry} size="md" />
      </Button>
      <Button {...args} variant="primary" disabled>
        Disabled
      </Button>
    </div>
  ),
};

export const Submit: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <SubmitButton>Save</SubmitButton>
      <SubmitButton isPending>Saving</SubmitButton>
      <SubmitButton variant="destructive">Delete</SubmitButton>
    </div>
  ),
};
