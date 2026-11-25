import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Code, Snippet, SnippetCopy, SnippetTabs } from '@restate/ui-code';
import { Copy } from '@restate/ui-copy';
import { SegmentedControl } from '@restate/ui-tabs';

const meta = {
  title: 'Data display/Code',
  component: Code,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Code>;

export default meta;
type Story = StoryObj<typeof meta>;

const register = 'restate deployments register http://localhost:9080';
const curl = `curl localhost:8080/Checkout/process \\
  --json '{"cart": "cart-1042", "total": 42}'`;

export const Default: Story = {
  render: () => (
    <Code>
      <Snippet>
        {register}
        <SnippetCopy copyText={register} size="xs" />
      </Snippet>
    </Code>
  ),
};

export const MultiLine: Story = {
  render: () => (
    <Code>
      <Snippet>
        {curl}
        <SnippetCopy copyText={curl} size="xs" />
      </Snippet>
    </Code>
  ),
};

const samples = {
  typescript: 'const result = await ctx.run(() => charge(cart));',
  java: 'var result = ctx.run(String.class, () -> charge(cart));',
};

function LanguageSamples() {
  const [language, setLanguage] = useState<keyof typeof samples>('typescript');
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1">
        <SegmentedControl
          label="Language"
          value={language}
          options={[
            { value: 'typescript', label: 'TypeScript' },
            { value: 'java', label: 'Java' },
          ]}
          onChange={setLanguage}
        />
        <Copy copyText={samples[language]} size="xs" className="ml-auto" />
      </div>
      <Code>
        <Snippet language={language}>{samples[language]}</Snippet>
      </Code>
    </div>
  );
}

export const Languages: Story = {
  render: () => <LanguageSamples />,
};

const publicKey = 'publickeyv1_2G8dYHvM3PqRk4mUjXz9TnCsWbA6eLfH5oJi7NxQrDtK';
const identity = {
  typescript: `restate.endpoint().bind(checkout).withIdentityV1("${publicKey}")`,
  java: `Endpoint.bind(new Checkout()).withRequestIdentityVerifier(RequestIdentityVerifier.fromKey("${publicKey}"))`,
  python: `restate.app(services=[checkout], identity_keys=["${publicKey}"])`,
  go: `server.NewRestate().Bind(restate.Reflect(Checkout{})).WithIdentityV1("${publicKey}")`,
  kotlin: `endpoint { bind(Checkout()); requestIdentityVerifier = RequestIdentityVerifier.fromKey("${publicKey}") }`,
};

export const LanguageTabs: Story = {
  render: () => (
    <SnippetTabs
      languages={['typescript', 'java', 'python', 'go', 'kotlin']}
      defaultLanguage="typescript"
    >
      {(language) => {
        const code = identity[language as keyof typeof identity];
        return (
          <Code>
            <Snippet language={language}>
              {code}
              <SnippetCopy copyText={code} size="xs" />
            </Snippet>
          </Code>
        );
      }}
    </SnippetTabs>
  ),
};
