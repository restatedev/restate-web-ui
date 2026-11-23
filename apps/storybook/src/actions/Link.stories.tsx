import type { Meta, StoryObj } from '@storybook/react-vite';
import { Link } from '@restate/ui-link';
import { Icon, IconName } from '@restate/ui-icons';

const meta: Meta<typeof Link> = {
  title: 'Actions/Link',
  component: Link,
  args: { href: '/invocations', children: 'View invocations' },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: [
        'primary',
        'secondary',
        'button',
        'secondary-button',
        'destructive-button',
        'icon',
      ],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: 'primary' } };

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-4">
      <Link {...args} variant="primary">
        Primary
      </Link>
      <Link {...args} variant="secondary">
        Secondary
      </Link>
      <Link {...args} variant="button">
        Button
      </Link>
      <Link {...args} variant="secondary-button">
        Secondary button
      </Link>
      <Link {...args} variant="destructive-button">
        Destructive button
      </Link>
      <Link {...args} variant="icon" aria-label="Open in a new tab">
        <Icon name={IconName.ExternalLink} className="h-4 w-4" />
      </Link>
    </div>
  ),
};

export const External: Story = {
  args: {
    href: 'https://docs.restate.dev',
    target: '_blank',
    rel: 'noopener noreferrer',
    children: 'Restate documentation',
  },
};
