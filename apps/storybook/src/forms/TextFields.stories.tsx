import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  FormFieldInput,
  FormFieldNumberInput,
  FormFieldTextarea,
  FormFieldDateTimeInput,
} from '@restate/ui-form-field';

const meta: Meta<typeof FormFieldInput> = {
  title: 'Forms/Text fields',
  component: FormFieldInput,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  args: {
    name: 'uri',
    label: 'Endpoint',
    placeholder: 'http://localhost:9080',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Input: Story = {};

export const Required: Story = { args: { required: true } };

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'http://localhost:9080' },
};

export const ReadOnly: Story = {
  args: { readonly: true, defaultValue: 'http://localhost:9080' },
};

export const WithError: Story = {
  args: {
    defaultValue: 'localhost',
    errorMessage: 'Enter a URL that starts with http:// or https://',
  },
};

export const Number: Story = {
  render: () => (
    <FormFieldNumberInput
      name="retries"
      label="Max attempts"
      defaultValue={10}
      minValue={1}
    />
  ),
};

export const Textarea: Story = {
  render: () => (
    <FormFieldTextarea
      name="description"
      label="Description"
      placeholder="What this key is for"
    />
  ),
};

export const DateTime: Story = {
  render: () => <FormFieldDateTimeInput name="from" label="From" />,
};
