import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
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

function StatusExample() {
  const [value, setValue] = useState('inflight');
  return (
    <SegmentedControl
      size="md"
      label="Invocation status"
      value={value}
      onChange={setValue}
      options={[
        { value: 'all', label: 'All' },
        {
          value: 'inflight',
          label: 'In-flight',
          hint: 'Not finished yet: running, held up or suspended',
        },
        {
          value: 'stuck',
          label: 'Held up',
          hint: 'Waiting to start, retry or resume',
        },
        { value: 'completed', label: 'Completed' },
      ]}
    />
  );
}

function CountsExample() {
  const [value, setValue] = useState<'all' | 'not-completed' | 'completed'>(
    'not-completed',
  );
  const count = (n: string) => (
    <span className="font-medium text-muted tabular-nums">{n}</span>
  );
  return (
    <SegmentedControl
      size="md"
      label="Invocation breakdown"
      value={value}
      onChange={setValue}
      options={[
        { value: 'all', label: 'All statuses', count: count('20.1K') },
        { value: 'not-completed', label: 'Not completed', count: count('83') },
        { value: 'completed', label: 'Completed', count: count('20K') },
      ]}
    />
  );
}

export const Medium: Story = {
  args: { label: '', options: [], value: '', onChange: () => undefined },
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <StatusExample />
      <CountsExample />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByText('Held up'));
    await within(document.body).findByText(
      'Waiting to start, retry or resume',
      undefined,
      { timeout: 3000 },
    );
  },
};
