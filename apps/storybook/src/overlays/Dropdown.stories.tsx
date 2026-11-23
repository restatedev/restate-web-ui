import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn, userEvent, within } from 'storybook/test';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownSeparator,
  DropdownTrigger,
} from '@restate/ui-dropdown';
import { ActionText } from '@restate/ui-action-text';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';

const meta = {
  title: 'Overlays/Dropdown',
  component: Dropdown,
  parameters: {
    layout: 'padded',
    docs: { story: { inline: false, height: '400px' } },
  },
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

const openTrigger: Story['play'] = async ({ canvasElement }) => {
  await userEvent.click(within(canvasElement).getByRole('button'));
};

function Trigger({ children }: { children: string }) {
  return (
    <DropdownTrigger>
      <Button
        variant="secondary"
        size="xs"
        className="flex items-center gap-1.5"
      >
        {children}
        <Icon name={IconName.ChevronsUpDown} size="xs" />
      </Button>
    </DropdownTrigger>
  );
}

export const Actions: Story = {
  render: () => (
    <Dropdown>
      <Trigger>Actions</Trigger>
      <DropdownPopover placement="bottom start">
        <DropdownSection title="Invocation">
          <DropdownMenu onSelect={fn()}>
            <DropdownItem value="pause">
              <Icon name={IconName.Pause} size="sm" className="opacity-80" />
              <ActionText>Pause</ActionText>
            </DropdownItem>
            <DropdownItem value="restart">
              <Icon name={IconName.Restart} size="sm" className="opacity-80" />
              <ActionText>Restart as new</ActionText>
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem value="cancel" destructive>
              <Icon name={IconName.Cancel} size="sm" className="opacity-80" />
              <ActionText>Cancel</ActionText>
            </DropdownItem>
            <DropdownItem value="kill" destructive>
              <Icon name={IconName.Kill} size="sm" className="opacity-80" />
              <ActionText>Kill</ActionText>
            </DropdownItem>
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  ),
  play: openTrigger,
};

export const Selectable: Story = {
  render: () => (
    <Dropdown>
      <Trigger>Sort by</Trigger>
      <DropdownPopover placement="bottom start">
        <DropdownSection title="Sort by">
          <DropdownMenu
            selectable
            selectedItems={['created_at']}
            onSelect={fn()}
          >
            <DropdownItem value="created_at">Created at</DropdownItem>
            <DropdownItem value="modified_at">Modified at</DropdownItem>
            <DropdownItem value="duration">Duration</DropdownItem>
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  ),
  play: openTrigger,
};

export const Sections: Story = {
  render: () => (
    <Dropdown>
      <Trigger>Checkout</Trigger>
      <DropdownPopover placement="bottom start">
        <DropdownSection title="Virtual Objects">
          <DropdownMenu selectable selectedItems={['Checkout']} onSelect={fn()}>
            <DropdownItem value="Checkout">Checkout</DropdownItem>
            <DropdownItem value="Cart">Cart</DropdownItem>
          </DropdownMenu>
        </DropdownSection>
        <DropdownSection title="Workflows">
          <DropdownMenu selectable selectedItems={['Checkout']} onSelect={fn()}>
            <DropdownItem value="Signup">Signup</DropdownItem>
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  ),
  play: openTrigger,
};
