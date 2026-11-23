import type { Meta, StoryObj } from '@storybook/react-vite';
import { Copy } from '@restate/ui-copy';
import { Code, Snippet, SnippetCopy } from '@restate/ui-code';

const meta = {
  title: 'Actions/Copy',
  component: Copy,
  args: { copyText: 'inv_1gQNFQQ1HLWM7jo57gxCUiOlQ5nBYztfXV' },
} satisfies Meta<typeof Copy>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InCode: Story = {
  render: (args) => (
    <Code>
      <Snippet>
        restate deployments register http://localhost:9080
        <SnippetCopy copyText="restate deployments register http://localhost:9080" />
      </Snippet>
      <Snippet>
        {args.copyText}
        <Copy {...args} />
      </Snippet>
    </Code>
  ),
};
