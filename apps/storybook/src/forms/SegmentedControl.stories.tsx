import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SegmentedControl } from '@restate/ui-tabs';

const meta = {
  title: 'Forms/SegmentedControl',
  component: SegmentedControl,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

function Example() {
  const [value, setValue] = useState<'text' | 'file'>('text');
  return (
    <SegmentedControl
      label="Input source"
      value={value}
      onChange={setValue}
      options={[
        { value: 'text', label: 'Text' },
        { value: 'file', label: 'File' },
      ]}
    />
  );
}

function WithDescriptionsExample() {
  const [value, setValue] = useState<'byId' | 'byTarget'>('byId');
  return (
    <SegmentedControl
      label="Find the invocation"
      value={value}
      onChange={setValue}
      options={[
        {
          value: 'byId',
          label: 'By invocation ID',
          description: 'Paste the ID a call returned',
        },
        {
          value: 'byTarget',
          label: 'By target',
          description: 'Service, key and handler',
        },
      ]}
    />
  );
}

export const Default: Story = {
  args: { label: '', options: [], value: '', onChange: () => undefined },
  render: () => <Example />,
};

export const WithDescriptions: Story = {
  args: { label: '', options: [], value: '', onChange: () => undefined },
  render: () => <WithDescriptionsExample />,
};
