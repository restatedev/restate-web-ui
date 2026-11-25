import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  FormFieldCheckbox,
  FormFieldCombobox,
  FormFieldLabel,
  FormFieldSelect,
  Option,
  Switch,
} from '@restate/ui-form-field';
import {
  Radio,
  RadioCard,
  RadioCards,
  RadioGroup,
} from '@restate/ui-radio-group';

const meta = {
  title: 'Forms/Choices',
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

export const Select: Story = {
  render: () => (
    <FormFieldSelect
      name="deployment"
      label="Deployment"
      placeholder="Select a deployment"
      defaultValue="Latest"
    >
      <Option>Latest</Option>
      <Option>Keep</Option>
    </FormFieldSelect>
  ),
};

export const Combobox: Story = {
  render: () => (
    <FormFieldCombobox
      name="service"
      label="Service"
      placeholder="Search services"
      options={[
        { id: 'Checkout', label: 'Checkout' },
        { id: 'Payments', label: 'Payments' },
        { id: 'Shipping', label: 'Shipping' },
      ]}
    />
  ),
};

export const Checkbox: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <FormFieldCheckbox name="force" value="true">
        Force the deployment
      </FormFieldCheckbox>
      <FormFieldCheckbox name="skip" value="true" defaultChecked>
        Skip this confirmation in the future
      </FormFieldCheckbox>
      <FormFieldCheckbox name="disabled" value="true" disabled>
        Disabled
      </FormFieldCheckbox>
    </div>
  ),
};

export const Toggle: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Switch defaultSelected>Live</Switch>
      <Switch>Follow the latest entry</Switch>
      <Switch isDisabled>Disabled</Switch>
    </div>
  ),
};

export const Radios: Story = {
  render: () => (
    <RadioGroup name="retention" defaultValue="1d">
      <FormFieldLabel>Journal retention</FormFieldLabel>
      <Radio value="1d">1 day</Radio>
      <Radio value="7d">7 days</Radio>
      <Radio value="off" disabled>
        Off
      </Radio>
    </RadioGroup>
  ),
};

export const Cards: Story = {
  render: () => (
    <RadioGroup name="public" defaultValue="true">
      <FormFieldLabel>
        <span slot="description">Choose how your service is reached:</span>
      </FormFieldLabel>
      <RadioCards>
        <RadioCard
          value="true"
          label="Public"
          description="Reachable through ingress (HTTP and Kafka)"
        />
        <RadioCard
          value="false"
          label="Private"
          description="Reachable only from other services"
        />
      </RadioCards>
    </RadioGroup>
  ),
};
