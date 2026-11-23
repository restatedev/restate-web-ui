import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, type ComponentProps } from 'react';
import type { editor } from 'monaco-editor';
import { userEvent, within } from 'storybook/test';
import { Editor } from '@restate/ui-editor';
import { Button } from '@restate/ui-button';
import { DropdownSection } from '@restate/ui-dropdown';
import { FormFieldCode, FormFieldLabel } from '@restate/ui-form-field';
import { Icon, IconName } from '@restate/ui-icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui-popover';

const CART = JSON.stringify(
  {
    cart: 'cart-1042',
    total: 42,
    currency: 'EUR',
    items: ['mug-01', 'tee-07'],
  },
  null,
  2,
);

function EditorWithRef(
  props: Omit<ComponentProps<typeof Editor>, 'editorRef'>,
) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  return <Editor {...props} editorRef={editorRef} />;
}

const meta = {
  title: 'Forms/Editor',
  component: Editor,
  parameters: { layout: 'padded' },
  args: { editorRef: { current: null }, value: CART },
  argTypes: { editorRef: { table: { disable: true } } },
} satisfies Meta<typeof Editor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Field: Story = {
  parameters: { docs: { story: { inline: false, height: '440px' } } },
  argTypes: { applyTheme: { control: false }, isFormatted: { control: false } },
  decorators: [
    (Story) => (
      <div className="max-w-lg">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <div className="flex flex-col">
      <FormFieldLabel>
        <span slot="title">Value</span>
        <span slot="description">
          The invocation's result, usually JSON. Leave it empty for no value.
        </span>
      </FormFieldLabel>
      <FormFieldCode
        name="value"
        value={args.value}
        readonly={args.readonly}
        autoFocus={args.autoFocus}
        className="font-mono"
      />
    </div>
  ),
};

export const Empty: Story = { ...Field, args: { value: '' } };

export const PayloadPopover: Story = {
  parameters: { docs: { story: { inline: false, height: '440px' } } },
  render: (args) => (
    <Popover>
      <PopoverTrigger>
        <Button
          variant="secondary"
          className="mx-0.5 my-0.5 flex h-5 min-w-6 items-center justify-center gap-0 rounded-xl p-0 font-sans text-2xs font-medium text-muted shadow-none outline-offset-0"
        >
          <Icon name={IconName.Eye} size="xs" className="mx-1.5" />
          <span className="block min-w-0 truncate">
            Input
            <span className="inline-block w-3" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="[&_header]:px-0 [&_header]:pt-1">
        <DropdownSection
          className="mb-1 w-[90vw] max-w-[min(90vw,600px)] min-w-80 overflow-auto py-0 pr-0 pl-4"
          title={
            <div className="flex min-h-5.5 items-center text-0.5xs">
              <span className="inline-block pl-2">Input</span>
            </div>
          }
        >
          <div className="flex w-full items-center">
            <div className="relative min-w-0 flex-auto">
              <EditorWithRef
                {...args}
                readonly
                className="max-w-full font-mono text-xs [&_.monaco-editor]:w-[100vw]! [&_.monaco-editor]:max-w-full!"
              />
            </div>
          </div>
        </DropdownSection>
      </PopoverContent>
    </Popover>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
  },
};
