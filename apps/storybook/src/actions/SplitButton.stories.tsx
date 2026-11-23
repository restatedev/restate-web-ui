import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SplitButton } from '@restate/ui-split-button';
import { Button } from '@restate/ui-button';
import { DropdownItem } from '@restate/ui-dropdown';

const meta = {
  title: 'Actions/SplitButton',
  component: SplitButton,
  args: {
    onSelect: fn(),
    menus: (
      <>
        <DropdownItem value="edit">Edit…</DropdownItem>
        <DropdownItem destructive value="delete">
          Delete…
        </DropdownItem>
      </>
    ),
    children: <Button variant="secondary">Open</Button>,
  },
} satisfies Meta<typeof SplitButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mini: Story = { args: { mini: true } };

export const Medium: Story = { args: { mini: 'md' } };

export const Pending: Story = { args: { isPending: true } };
