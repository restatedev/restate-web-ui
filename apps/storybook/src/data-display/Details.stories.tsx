import type { Meta, StoryObj } from '@storybook/react-vite';
import type { PropsWithChildren } from 'react';
import { Code, Snippet, SnippetCopy } from '@restate/ui-code';
import { Details, Summary } from '@restate/ui-details';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { Section, SectionContent, SectionTitle } from '@restate/ui-section';

const meta = {
  title: 'Data display/Details',
  component: Details,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Details>;

export default meta;
type Story = StoryObj<typeof meta>;

const signingKey = 'publickeyv1_2G8dYHvM3PqRk4mUjXz9TnCsWbA6eLfH5oJi7NxQrDtK';

function StepNumber({ num }: { num: number }) {
  return (
    <div className="mr-1.5 mb-2 inline-flex h-5 w-5 items-center justify-center rounded-md border bg-surface text-0.5xs font-medium text-info-strong">
      {num}
    </div>
  );
}

function LearnMore({ href }: { href: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline text-tertiary"
      variant="secondary"
    >
      Learn more…
    </Link>
  );
}

function HttpEndpoints({
  open,
  disabled,
}: {
  open?: boolean;
  disabled?: boolean;
}) {
  return (
    <Details open={open} disabled={disabled}>
      <Summary>
        <div className="inline-flex items-center">
          <Icon name={IconName.Http} className="mr-2 h-4 w-4 text-muted" />
          HTTP endpoints{' '}
          <span className="ml-0.5 text-muted">
            (e.g. ECS, Cloudflare, Vercel)
          </span>{' '}
        </div>
        <div className="pointer-events-none mt-2 block text-sm text-muted">
          Verify requests by checking the signatures Restate Cloud attaches to
          all requests.
        </div>
      </Summary>
      <div className="flex flex-col gap-2 text-sm">
        <p className="text-tertiary">
          You must secure access to your service so that only Restate can call
          it. The easiest way to do this is with our native request identity
          feature. All requests to your service will be signed with a unique
          environment-specific private key.{' '}
          <LearnMore href="https://docs.restate.dev/cloud/connecting-services#public-endpoint-with-request-signing" />
        </p>
        <ol className="mt-2 flex flex-col gap-3">
          <li>
            <StepNumber num={1} />
            You can verify requests coming from this environment using its
            unique public key:
            <Code>
              <Snippet className="relative py-1 pr-8 pl-2">
                {signingKey}
                <SnippetCopy
                  copyText={signingKey}
                  className="-top-1 -right-1"
                />
              </Snippet>
            </Code>
          </li>
          <li>
            <StepNumber num={2} />
            You must provide the public key to the Restate SDK to ensure it only
            accepts requests from this environment:
            <Code className="relative">
              <Snippet
                language="typescript"
                className="relative py-1 pr-8 pl-2"
              >
                {`restate.endpoint().bind(checkout).withIdentityV1("${signingKey}")`}
                <SnippetCopy
                  copyText={`restate.endpoint().bind(checkout).withIdentityV1("${signingKey}")`}
                  className="-top-1 -right-1"
                />
              </Snippet>
            </Code>
          </li>
        </ol>
      </div>
    </Details>
  );
}

function AwsLambda({ open, disabled }: { open?: boolean; disabled?: boolean }) {
  return (
    <Details open={open} disabled={disabled}>
      <Summary>
        <div className="inline-flex items-center">
          <Icon name={IconName.Lambda} className="mr-2 h-4 w-4 text-muted" />
          AWS Lambda
        </div>
        <span className="pointer-events-none mt-2 block text-sm text-muted">
          Invoke Lambda functions by letting Restate Cloud assume an AWS
          identity with the required permissions.
        </span>
      </Summary>
      <div className="flex flex-col gap-2 text-sm">
        <p className="text-tertiary">
          To invoke services running on AWS Lambda, Restate Cloud needs to
          assume an AWS identity in the same account that the Lambda is deployed
          to.{' '}
          <LearnMore href="https://docs.restate.dev/cloud/connecting-services#connecting-aws-lambda-services" />
        </p>
      </div>
    </Details>
  );
}

function SecuritySection({ children }: PropsWithChildren) {
  return (
    <Section>
      <SectionTitle variant="settings">
        <span className="inline-flex items-center gap-2">
          <Icon
            name={IconName.ShieldCheck}
            className="h-[1.125em] w-[1.125em] text-secondary"
          />
          Security
        </span>
        <p>
          For secure and reliable communications between your services and
          Restate Cloud, please follow these guidelines.{' '}
          <LearnMore href="https://docs.restate.dev/cloud/connecting-services#connecting-aws-lambda-services" />
        </p>
      </SectionTitle>
      <SectionContent className="relative flex flex-col px-0" raised={false}>
        {children}
      </SectionContent>
    </Section>
  );
}

export const Default: Story = {
  render: () => (
    <SecuritySection>
      <HttpEndpoints />
    </SecuritySection>
  ),
};

export const Open: Story = {
  render: () => (
    <SecuritySection>
      <HttpEndpoints open />
    </SecuritySection>
  ),
};

export const Stacked: Story = {
  render: () => (
    <SecuritySection>
      <HttpEndpoints />
      <AwsLambda />
    </SecuritySection>
  ),
};

export const Disabled: Story = {
  render: () => (
    <SecuritySection>
      <HttpEndpoints disabled />
      <AwsLambda disabled />
    </SecuritySection>
  ),
};
