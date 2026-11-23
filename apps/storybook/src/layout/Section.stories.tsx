import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  CollapsibleSection,
  CollapsibleSectionContent,
  CollapsibleSectionTitle,
  Section,
  SectionContent,
  SectionTitle,
} from '@restate/ui-section';
import { Header } from '@restate/ui-header';
import { IconName } from '@restate/ui-icons';

const meta = {
  title: 'Layout/Section',
  component: Section,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Section>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="max-w-md">
      <Section>
        <SectionTitle>Handlers</SectionTitle>
        <SectionContent raised>
          <p className="text-sm text-secondary">process, notify, cancel</p>
        </SectionContent>
      </Section>
    </div>
  ),
};

export const Collapsible: Story = {
  render: () => (
    <div className="max-w-md">
      <CollapsibleSection>
        <CollapsibleSectionTitle>Advanced</CollapsibleSectionTitle>
        <CollapsibleSectionContent raised>
          <p className="text-sm text-secondary">
            Headers, idempotency key, delay.
          </p>
        </CollapsibleSectionContent>
      </CollapsibleSection>
    </div>
  ),
};

export const Headers: Story = {
  render: () => (
    <div className="flex max-w-lg flex-col gap-3">
      <Header icon={IconName.Invocation} iconLabel="Invocation">
        Default header
      </Header>
      <Header variant="success" icon={IconName.Check} iconLabel="Succeeded">
        Succeeded
      </Header>
      <Header variant="warning" icon={IconName.Pause} iconLabel="Paused">
        Paused after 70 attempts
      </Header>
      <Header variant="danger" icon={IconName.CircleX} iconLabel="Failed">
        Failed with a terminal error
      </Header>
      <Header variant="pending" icon={IconName.Timer} iconLabel="Pending">
        Waiting to run
      </Header>
    </div>
  ),
};
