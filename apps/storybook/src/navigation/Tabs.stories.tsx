import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@restate/ui-tabs';
import { Nav, NavItem } from '@restate/ui-nav';

const meta = {
  title: 'Navigation/Tabs',
  component: Tabs,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultTab="journal">
      <TabList aria-label="Invocation">
        <Tab id="journal">Journal</Tab>
        <Tab id="state">State</Tab>
        <Tab id="inbox">Inbox</Tab>
        <Tab id="disabled" disabled>
          Disabled
        </Tab>
      </TabList>
      <TabPanels>
        <TabPanel id="journal">
          <p className="text-sm text-secondary">
            The journal of the invocation.
          </p>
        </TabPanel>
        <TabPanel id="state">
          <p className="text-sm text-secondary">Its key/value state.</p>
        </TabPanel>
        <TabPanel id="inbox">
          <p className="text-sm text-secondary">
            Invocations waiting behind it.
          </p>
        </TabPanel>
        <TabPanel id="disabled">
          <p className="text-sm text-secondary">Not available.</p>
        </TabPanel>
      </TabPanels>
    </Tabs>
  ),
};

export const PageNav: Story = {
  render: () => (
    <Nav ariaCurrentValue="page">
      <NavItem href="/">Overview</NavItem>
      <NavItem href="/invocations">Invocations</NavItem>
      <NavItem href="/deployments">Deployments</NavItem>
    </Nav>
  ),
};
