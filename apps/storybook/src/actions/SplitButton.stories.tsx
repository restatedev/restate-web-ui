import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SplitButton } from '@restate/ui-split-button';
import { Button } from '@restate/ui-button';
import { DropdownItem } from '@restate/ui-dropdown';
import { Icon, IconName } from '@restate/ui-icons';

const menus = (
  <>
    <DropdownItem value="edit">Edit…</DropdownItem>
    <DropdownItem destructive value="delete">
      Delete…
    </DropdownItem>
  </>
);

const meta = {
  title: 'Actions/SplitButton',
  component: SplitButton,
  parameters: {
    layout: 'padded',
    docs: { story: { inline: false, height: '220px' } },
  },
  args: { onSelect: fn(), menus },
} satisfies Meta<typeof SplitButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RowActions: Story = {
  render: (args) => (
    <div className="flex w-96 items-center justify-between gap-3 rounded-xl border bg-surface px-3 py-2 text-xs">
      <span className="font-mono text-tertiary">cart-1042</span>
      <SplitButton {...args} mini splitClassName="rounded-r-lg px-1.5 py-1">
        <Button
          variant="secondary"
          className="invisible absolute right-full z-2 translate-x-px rounded-l-md rounded-r-none px-2 py-0.5 [font-size:inherit] [line-height:inherit] group-focus-within:visible group-hover:visible"
        >
          Edit
        </Button>
      </SplitButton>
    </div>
  ),
};

export const Toolbar: Story = {
  render: (args) => (
    <SplitButton
      {...args}
      mini={false}
      className="text-0.5xs"
      splitClassName="rounded-r-lg px-1.5 py-0.5"
    >
      <Button
        variant="secondary"
        className="relative left-px flex items-center gap-1.5 rounded-l-lg rounded-r-none p-0.5 px-2 text-0.5xs"
      >
        <Icon name={IconName.Pencil} size="xs" />
        Edit
      </Button>
    </SplitButton>
  ),
};

export const Pending: Story = {
  render: (args) => (
    <SplitButton
      {...args}
      mini={false}
      isPending
      className="text-0.5xs"
      splitClassName="rounded-r-lg px-1.5 py-0.5"
    >
      <Button
        variant="secondary"
        disabled
        className="relative left-px flex items-center gap-1.5 rounded-l-lg rounded-r-none p-0.5 px-2 text-0.5xs"
      >
        <Icon name={IconName.Pencil} size="xs" />
        Edit
      </Button>
    </SplitButton>
  ),
};
