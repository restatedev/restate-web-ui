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
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md'] },
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

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-4">
        {(['xs', 'sm', 'md'] as const).map((size) => (
          <span key={size} className="flex flex-col items-center gap-2">
            <Button {...args} variant="secondary" size={size}>
              Register deployment
            </Button>
            <code className="font-mono text-2xs text-tertiary">{size}</code>
          </span>
        ))}
      </div>
      <div className="flex items-end gap-4">
        {(['2xs', 'xs', 'sm', 'md'] as const).map((size) => (
          <span key={size} className="flex flex-col items-center gap-2">
            <Button {...args} variant="icon" size={size} aria-label="Refresh">
              <Icon
                name={IconName.Retry}
                size={size === '2xs' ? '2xs' : 'sm'}
              />
            </Button>
            <code className="font-mono text-2xs text-tertiary">{size}</code>
          </span>
        ))}
      </div>
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
