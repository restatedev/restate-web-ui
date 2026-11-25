import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { JsonSchemaTree, MarkdownDescription } from '@restate/ui-json-schema';
import { Button } from '@restate/ui-button';
import { DropdownSection } from '@restate/ui-dropdown';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui-popover';

const checkoutApi = {
  openapi: '3.1.0',
  info: { title: 'Checkout', version: '1' },
  components: {
    schemas: {
      ProcessRequest: {
        type: 'object',
        description:
          'Charges the items of a cart.\n\nCalling `process` twice for the same cart returns the first result.',
        properties: {
          cart: {
            type: 'string',
            description: 'The key of the **Cart** to charge.',
            examples: ['cart-1042'],
          },
          total: {
            type: 'integer',
            minimum: 0,
            description: 'Amount in cents.',
          },
          currency: {
            type: 'string',
            enum: ['EUR', 'USD', 'GBP'],
            default: 'EUR',
          },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/LineItem' },
          },
          payment: {
            oneOf: [
              { $ref: '#/components/schemas/Card' },
              { $ref: '#/components/schemas/Invoice' },
            ],
          },
          coupon: { type: ['string', 'null'], pattern: '^[A-Z0-9]{6}$' },
        },
        required: ['cart', 'total'],
        additionalProperties: false,
      },
      LineItem: {
        type: 'object',
        properties: {
          sku: { type: 'string' },
          qty: { type: 'integer', minimum: 1, default: 1 },
        },
        required: ['sku'],
      },
      Card: {
        type: 'object',
        title: 'Card',
        properties: {
          type: { type: 'string', const: 'card' },
          token: { type: 'string', description: 'A tokenized card.' },
        },
        required: ['type', 'token'],
      },
      Invoice: {
        type: 'object',
        title: 'Invoice',
        properties: {
          type: { type: 'string', const: 'invoice' },
          dueInDays: { type: 'integer', minimum: 1, maximum: 90, default: 14 },
        },
        required: ['type'],
      },
      ProcessResponse: {
        type: 'object',
        properties: {
          invoiceId: {
            type: 'string',
            readOnly: true,
            description: 'The invoice for the cart.',
          },
          status: { type: 'string', enum: ['paid', 'pending'] },
          paidAt: { type: 'string', format: 'date-time' },
        },
        required: ['invoiceId', 'status'],
      },
    },
  },
};

const handlerInputSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    cart: { type: 'string' },
    total: { type: 'integer', minimum: 0 },
    currency: { type: 'string', enum: ['EUR', 'USD', 'GBP'], default: 'EUR' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sku: { type: 'string' },
          qty: { type: 'integer', minimum: 1 },
        },
        required: ['sku', 'qty'],
      },
    },
  },
  required: ['cart', 'total'],
  additionalProperties: false,
};

const meta = {
  title: 'Data display/JSON schema',
  component: JsonSchemaTree,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    mode: {
      control: 'inline-radio',
      options: ['read', 'write', 'standalone'],
    },
  },
} satisfies Meta<typeof JsonSchemaTree>;

export default meta;
type Story = StoryObj<typeof meta>;

const sectionStyles = {
  section:
    'flex min-w-0 flex-col gap-2 rounded-xl border bg-surface p-4 shadow-xs',
  title: 'text-0.5xs font-medium text-secondary',
  note: 'text-0.5xs text-muted',
};

export const Input: Story = {
  args: {
    schema: { $ref: '#/components/schemas/ProcessRequest' },
    root: checkoutApi,
    mode: 'write',
  },
  render: (args) => (
    <section aria-label="Input" className={sectionStyles.section}>
      <h3 className={sectionStyles.title}>Input</h3>
      <JsonSchemaTree {...args} />
    </section>
  ),
};

export const Output: Story = {
  args: {
    schema: { $ref: '#/components/schemas/ProcessResponse' },
    root: checkoutApi,
    mode: 'read',
  },
  render: (args) => (
    <section aria-label="Output" className={sectionStyles.section}>
      <h3 className={sectionStyles.title}>Output</h3>
      <MarkdownDescription className={sectionStyles.note}>
        The invoice for the cart, returned once the payment settled.
      </MarkdownDescription>
      <JsonSchemaTree {...args} />
    </section>
  ),
};

export const AnyValue: Story = {
  args: { emptyText: 'Any JSON value' },
  render: (args) => (
    <section aria-label="Input" className={sectionStyles.section}>
      <h3 className={sectionStyles.title}>Input</h3>
      <JsonSchemaTree {...args} />
    </section>
  ),
};

export const HandlerPopover: Story = {
  parameters: { docs: { story: { inline: false, height: '480px' } } },
  args: { schema: handlerInputSchema, mode: 'standalone', className: 'py-2' },
  render: (args) => (
    <div className="text-0.5xs leading-[1.75rem] font-medium text-tertiary italic">
      <span className="flex items-center">
        process
        <span className="shrink-0 text-subtle">{'('}</span>
        <div className="contents items-center gap-1 rounded-md py-0 pl-0.5 text-2xs text-secondary [&_button]:text-subtle">
          <span className="mr-0.5 contents font-mono leading-5 font-semibold text-muted">
            <Popover>
              <PopoverTrigger>
                <Button
                  variant="icon"
                  className="z-[2] max-w-fit grow basis-20 truncate rounded-xs px-0.5 py-0.5 font-mono [font-size:inherit] text-inherit [font-style:inherit] underline decoration-dashed decoration-from-font underline-offset-4 [&:not([href])]:cursor-default"
                >
                  <span className="truncate pr-0.5">object</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="[&_header]:font-mono [&_header]:text-0.5xs">
                <DropdownSection
                  className="mb-1 max-w-[min(90vw,600px)] min-w-80 overflow-auto px-4"
                  title={<span>Request</span>}
                >
                  <JsonSchemaTree {...args} />
                </DropdownSection>
              </PopoverContent>
            </Popover>
          </span>
        </div>
        <span className="shrink-0 text-subtle">{')'}</span>
      </span>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
  },
};

export const Description: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <MarkdownDescription className={sectionStyles.note}>
      {
        'The invoice for the cart. See the [payments guide](https://docs.restate.dev/) for the `pending` status.\n\n- `paid`: the payment settled\n- `pending`: an **Invoice** is waiting for the transfer\n\n| Status | Meaning |\n| --- | --- |\n| `paid` | The payment settled |\n| `pending` | An invoice was issued |'
      }
    </MarkdownDescription>
  ),
};

export const Collapsible: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="text-xs">
      <MarkdownDescription collapsible>
        {
          'Charges the items of a cart.\n\nCalling `process` twice for the same cart returns the first result, so it is safe to retry.\n\nSee the [payments guide](https://docs.restate.dev/).'
        }
      </MarkdownDescription>
    </div>
  ),
};
