import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { Badge } from '@restate/ui-badge';
import { FormFieldSelect } from '@restate/ui-form-field';
import { Icon, IconName } from '@restate/ui-icons';
import { ListBox, ListBoxItem, ListBoxSection } from '@restate/ui-listbox';

const meta = {
  title: 'Forms/ListBox',
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  render: () => (
    <ListBox aria-label="Service" selectable selectedItems={['Checkout']}>
      <ListBoxItem value="Checkout">Checkout</ListBoxItem>
      <ListBoxItem value="Cart">Cart</ListBoxItem>
      <ListBoxItem value="Payments">Payments</ListBoxItem>
    </ListBox>
  ),
};

export const Multiple: Story = {
  render: () => (
    <ListBox aria-label="Handlers" selectable multiple>
      <ListBoxItem value="process">process()</ListBoxItem>
      <ListBoxItem value="add">add()</ListBoxItem>
      <ListBoxItem value="clear">clear()</ListBoxItem>
    </ListBox>
  ),
};

export const WithDescriptions: Story = {
  render: () => (
    <ListBox aria-label="Value format" selectable selectedItems={['text']}>
      <ListBoxItem value="text">
        <div>Text</div>
        <div data-description className="text-xs opacity-70">
          Edit as text
        </div>
      </ListBoxItem>
      <ListBoxItem value="binary">
        <div>Binary (Base64)</div>
        <div data-description className="text-xs opacity-70">
          Edit as Base64, store decoded bytes
        </div>
      </ListBoxItem>
    </ListBox>
  ),
};

export const DisabledItems: Story = {
  render: () => (
    <ListBox
      aria-label="Service"
      selectable
      selectedItems={['Checkout']}
      disabledItems={['Payments']}
    >
      <ListBoxItem value="Checkout">Checkout</ListBoxItem>
      <ListBoxItem value="Cart">Cart</ListBoxItem>
      <ListBoxItem value="Payments">Payments</ListBoxItem>
    </ListBox>
  ),
};

export const Sections: Story = {
  render: () => (
    <ListBox aria-label="Services">
      <ListBoxSection title="Virtual Objects">
        <ListBoxItem value="Cart">Cart</ListBoxItem>
        <ListBoxItem value="Checkout">Checkout</ListBoxItem>
      </ListBoxSection>
      <ListBoxSection title="Workflows">
        <ListBoxItem value="Signup">Signup</ListBoxItem>
      </ListBoxSection>
    </ListBox>
  ),
};

export const Empty: Story = {
  render: () => (
    <ListBox
      aria-label="Services"
      renderEmptyState={() => (
        <p className="px-2 py-1 text-xs text-muted">No matching options.</p>
      )}
    />
  ),
};

const openSelect: Story['play'] = async ({ canvasElement }) => {
  await userEvent.click(within(canvasElement).getByRole('button'));
};

export const InSelect: Story = {
  parameters: { docs: { story: { inline: false, height: '280px' } } },
  render: () => (
    <FormFieldSelect
      name="format"
      placeholder="Value format"
      defaultSelectedKey="text"
    >
      <ListBoxItem value="text">
        <div>Text</div>
        <div data-description className="text-xs opacity-70">
          Edit as text
        </div>
      </ListBoxItem>
      <ListBoxItem value="binary">
        <div>Binary (Base64)</div>
        <div data-description className="text-xs opacity-70">
          Edit as Base64, store decoded bytes
        </div>
      </ListBoxItem>
    </FormFieldSelect>
  ),
  play: openSelect,
};

export const DeploymentSelect: Story = {
  parameters: { docs: { story: { inline: false, height: '320px' } } },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <FormFieldSelect
      className="min-w-xs flex-auto basis-[calc(50%-var(--spacing)*2)] [&_button>*]:max-w-full"
      label="Deployment"
      placeholder="Select a deployment"
      defaultValue="Latest"
      name="deployment"
      required
    >
      <ListBoxItem className="w-full max-w-xl" value="Latest">
        <div className="flex w-full min-w-0 flex-auto items-center gap-2 truncate">
          <div className="h-6 w-6 shrink-0 rounded-md border bg-surface shadow-xs">
            <Icon
              name={IconName.Http}
              className="h-full w-full p-1 text-subtle"
            />
          </div>
          <div className="max-w-fit min-w-0 grow basis-full truncate">
            http://localhost:9080
          </div>
          <Badge size="xs" intent="info">
            LATEST
          </Badge>
        </div>
      </ListBoxItem>
      <ListBoxItem className="w-full max-w-xl" value="Keep">
        <div className="flex w-full min-w-0 flex-auto items-center gap-2 truncate">
          <div className="h-6 w-6 shrink-0 rounded-md border bg-surface shadow-xs">
            <Icon
              name={IconName.Http}
              className="h-full w-full p-1 text-subtle"
            />
          </div>
          <div className="max-w-fit min-w-0 grow basis-full truncate">
            http://localhost:9081
          </div>
          <Badge size="xs" intent="info">
            CURRENT
          </Badge>
        </div>
      </ListBoxItem>
    </FormFieldSelect>
  ),
  play: openSelect,
};
