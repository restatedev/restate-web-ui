import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { API, JsonSchemaViewer } from '@restate/ui-api';
import { Button } from '@restate/ui-button';
import { DropdownSection } from '@restate/ui-dropdown';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui-popover';

const addRequest = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  additionalProperties: false,
  properties: {
    note: { type: 'string' },
    productId: { type: 'string' },
    quantity: {
      exclusiveMinimum: 0,
      maximum: 9007199254740991,
      type: 'integer',
    },
  },
  required: ['productId', 'quantity'],
  type: 'object',
};

const cartSpec = JSON.stringify({
  openapi: '3.1.0',
  info: {
    title: 'Cart',
    description: 'A shopping cart keyed by user id.',
    version: '1',
  },
  servers: [
    { description: 'Restate Ingress URL', url: 'http://localhost:8080/' },
  ],
  tags: [
    {
      name: 'Request Response',
      description: 'Request response to handler',
    },
    { name: 'Send', description: 'Send to handler' },
  ],
  paths: {
    '/Cart/{key}/add': {
      post: {
        operationId: 'add',
        summary: 'add',
        description: 'Call Cart handler add and wait for response',
        parameters: [
          { $ref: '#/components/parameters/key' },
          { $ref: '#/components/parameters/idempotencyKeyHeader' },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/addRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: '',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/addResponse' },
              },
            },
          },
          default: { $ref: '#/components/responses/GenericError' },
        },
      },
    },
    '/Cart/{key}/add/send': {
      post: {
        operationId: 'addSend',
        summary: 'add',
        description: 'Send request to Cart handler add',
        tags: ['Send'],
        parameters: [
          { $ref: '#/components/parameters/key' },
          { $ref: '#/components/parameters/idempotencyKeyHeader' },
          { $ref: '#/components/parameters/delay' },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/addRequest' },
            },
          },
        },
        responses: {
          '200': { $ref: '#/components/responses/Send' },
          '202': { $ref: '#/components/responses/Send' },
          default: { $ref: '#/components/responses/GenericError' },
        },
      },
    },
    '/Cart/{key}/items': {
      post: {
        operationId: 'items',
        summary: 'items',
        description: 'Call Cart handler items and wait for response',
        parameters: [
          { $ref: '#/components/parameters/key' },
          { $ref: '#/components/parameters/idempotencyKeyHeader' },
        ],
        requestBody: { required: false, content: { 'application/json': {} } },
        responses: {
          '200': {
            description: '',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/itemsResponse' },
              },
            },
          },
          default: { $ref: '#/components/responses/GenericError' },
        },
      },
    },
  },
  components: {
    parameters: {
      key: {
        in: 'path',
        name: 'key',
        required: true,
        schema: { type: 'string' },
      },
      idempotencyKeyHeader: {
        in: 'header',
        name: 'idempotency-key',
        required: false,
        description:
          'Idempotency key to execute the request, for more details checkout the [idempotency key documentation](https://docs.restate.dev/invoke/http#invoke-a-handler-idempotently).',
        schema: { type: 'string' },
      },
      delay: {
        in: 'query',
        name: 'delay',
        required: false,
        description:
          'Specify the delay to execute the operation, for more info check the [delay documentation](https://docs.restate.dev/invoke/http#sending-a-delayed-message-over-http)',
        example: '10s',
        schema: { type: 'string' },
      },
    },
    responses: {
      GenericError: {
        description: 'Error response',
        content: {
          'application/json': {
            example: {
              code: 500,
              description: 'Very bad error happened',
              message: 'Internal server error',
            },
            schema: { $ref: '#/components/schemas/RestateError' },
          },
        },
      },
      Send: {
        description: 'Send response',
        content: {
          'application/json': {
            example: {
              invocationId: 'inv_1gQNFQQ1HLWM7jo57gxCUiOlQ5nBYztfXV',
              status: 'Accepted',
            },
            schema: {
              additionalProperties: false,
              properties: {
                executionTime: {
                  description:
                    "Time when the invocation will be executed, in case 'delay' is used",
                  format: 'date-time',
                  type: 'string',
                },
                invocationId: { type: 'string' },
                status: {
                  enum: ['Accepted', 'PreviouslyAccepted'],
                  type: 'string',
                },
              },
              required: ['invocationId', 'status'],
              title: 'RestateSendResponse',
              type: 'object',
            },
          },
        },
      },
    },
    schemas: {
      RestateError: {
        additionalProperties: false,
        description:
          'Generic error used by Restate to propagate Terminal errors/exceptions back to callers',
        properties: {
          code: { title: 'error code', type: 'number' },
          message: { title: 'Error message', type: 'string' },
          metadata: {
            additionalProperties: { type: 'string' },
            title: 'Additional metadata map',
            type: 'object',
          },
          stacktrace: { title: 'Stacktrace of the error', type: 'string' },
        },
        required: ['message'],
        title: 'RestateError',
        type: 'object',
      },
      addRequest,
      addResponse: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        maximum: 9007199254740991,
        minimum: -9007199254740991,
        type: 'integer',
      },
      itemsResponse: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        items: addRequest,
        type: 'array',
      },
    },
  },
});

const tryItFetcher: typeof fetch = async (input) => {
  const url = input instanceof Request ? input.url : String(input);
  return Response.json(
    url.includes('/send')
      ? {
          invocationId: 'inv_1gQNFQQ1HLWM7jo57gxCUiOlQ5nBYztfXV',
          status: 'Accepted',
        }
      : 3,
  );
};

const meta = {
  title: 'Data display/API',
  component: API,
  parameters: {
    layout: 'fullscreen',
    docs: { story: { inline: false, height: '720px' } },
  },
  args: { apiDescriptionDocument: cartSpec },
  argTypes: {
    apiDescriptionDocument: { control: false },
    tryItFetcher: { control: false },
    layout: {
      control: 'inline-radio',
      options: ['sidebar', 'responsive', 'stacked'],
    },
  },
} satisfies Meta<typeof API>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: { layout: 'sidebar', tryItFetcher },
  beforeEach: () => {
    window.location.hash = '#/operations/add';
    return () => {
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${window.location.search}`,
      );
    };
  },
  render: (args) => (
    <div className="@container mx-4 mt-px mb-4 h-[40rem] overflow-hidden rounded-xl border border-default bg-surface shadow-xs [&_.HttpOperation_h1]:hidden! @max-[56rem]:[&_.sl-elements-api>*:first-child]:hidden! @max-[56rem]:[&_.sl-elements-api>*:nth-child(2)]:px-4! @max-[56rem]:[&_.sl-elements-api>*:nth-child(2)>*]:pt-4! @max-[56rem]:[&_.sl-elements-api>*:nth-child(2)>*>*>*:last-child]:flex-col-reverse! @max-[56rem]:[&_.sl-elements-api>*:nth-child(2)>*>*>*>*]:mx-0! @max-[56rem]:[&_.sl-elements-api>*:nth-child(2)>*>*>*>*]:w-full! @max-[56rem]:[&_.sl-ml-16]:ml-0! @max-[56rem]:[&_.sl-ml-16]:w-full! @max-[56rem]:[&_.sl-ml-16]:max-w-none! [&_.sl-py-16]:py-8! @max-[56rem]:[&_.sl-stack--8]:gap-6!">
      <API {...args} />
    </div>
  ),
};

const handlerSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    productId: { type: 'string' },
    quantity: { type: 'integer', exclusiveMinimum: 0 },
    note: { type: 'string' },
  },
  required: ['productId', 'quantity'],
  additionalProperties: false,
};

export const HandlerSchema: Story = {
  parameters: {
    layout: 'padded',
    docs: { story: { inline: false, height: '420px' } },
  },
  render: () => (
    <Popover>
      <PopoverTrigger>
        <Button
          variant="icon"
          className="z-[2] max-w-fit grow basis-20 truncate rounded-xs px-0.5 py-0.5 font-mono text-2xs text-subtle underline decoration-dashed decoration-from-font underline-offset-4 [&:not([href])]:cursor-default"
        >
          <span className="truncate pr-0.5">object</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="[&_header]:font-mono [&_header]:text-0.5xs">
        <DropdownSection
          className="mb-1 max-w-[min(90vw,600px)] min-w-80 overflow-auto px-4"
          title={<span>Request</span>}
        >
          <JsonSchemaViewer
            className="font-mono [&_.JsonSchemaViewer>*>[aria-haspopup]]:mt-2 [&_.JsonSchemaViewer>[data-test='property-description']]:mt-2 [&:has([aria-haspopup])]:min-h-32"
            schema={handlerSchema}
          />
        </DropdownSection>
      </PopoverContent>
    </Popover>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
  },
};
