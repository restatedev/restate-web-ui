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
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';

const meta = {
  title: 'Overlays/Dropdown',
  component: Dropdown,
  parameters: { docs: { story: { inline: false, height: '360px' } } },
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

const openTrigger: Story['play'] = async ({ canvasElement }) => {
  await userEvent.click(within(canvasElement).getByRole('button'));
};

export const Actions: Story = {
  render: () => (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="secondary" className="flex items-center gap-1.5">
          Actions
          <Icon name={IconName.ChevronsUpDown} size="sm" />
        </Button>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownSection title="Invocation">
          <DropdownMenu onSelect={fn()}>
            <DropdownItem value="pause">Pause…</DropdownItem>
            <DropdownItem value="restart">Restart as new…</DropdownItem>
            <DropdownItem value="cancel" destructive>
              Cancel…
            </DropdownItem>
            <DropdownItem value="kill" destructive>
              Kill…
            </DropdownItem>
          </DropdownMenu>
        </DropdownSection>
        <DropdownSeparator />
        <DropdownMenu onSelect={fn()}>
          <DropdownItem href="/invocations">View all invocations</DropdownItem>
        </DropdownMenu>
      </DropdownPopover>
    </Dropdown>
  ),
  play: openTrigger,
};

export const Selectable: Story = {
  render: () => (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="secondary">Sort by</Button>
      </DropdownTrigger>
      <DropdownPopover>
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
