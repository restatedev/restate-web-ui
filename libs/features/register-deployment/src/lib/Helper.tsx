import { useRestateContext } from '@restate/features/restate-context';
import { Code, Snippet, SnippetCopy } from '@restate/ui/code';
import { useOnboarding } from '@restate/util/feature-flag';
import { PropsWithChildren, ReactNode, useState } from 'react';
import { useRegisterDeploymentContext } from './Context';
import { tv } from '@restate/util/styles';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';

const containerStyles = tv({
  base: 'relative transition-all',
  variants: {
    isOpen: {
      true: '',
      false:
        'max-h-8 overflow-hidden mask-[linear-gradient(to_top,transparent_0rem,black_100%)] opacity-60 [&_code]:-mb-2',
    },
  },
});
function Container({
  children,
  title,
}: PropsWithChildren<{ title: ReactNode }>) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative rounded-xl border border-sky-300/30 bg-sky-50/40 p-2.5 text-sky-800 transition-all">
      {title}
      <div className={containerStyles({ isOpen })}>{children}</div>
      {!isOpen && (
        <Button
          variant="icon"
          className="absolute bottom-1 left-1/2 -mb-0.5 -translate-x-1/2 px-4 text-0.5xs text-sky-600"
          onClick={() => setIsOpen(true)}
        >
          <Icon name={IconName.ChevronDown} className="mr-1 h-4 w-4" />
          Expand{' '}
        </Button>
      )}
    </div>
  );
}

const CLOUDFLARE_SCRIPT = `import * as restate from '@restatedev/restate-sdk-cloudflare-workers/fetch';\n\nexport default { \n\tfetch: restate.createEndpointHandler({\n\t  services: [myService],\n\t  identityKeys: ["IDENTITY_KEY"]\n\t})\n};`;
const VERCEL_SCRIPT = `import * as restate from '@restatedev/restate-sdk/fetch';\n\nconst endpoint = restate.createEndpointHandler({\n\tservices: [myService],\n\tidentityKeys: ["IDENTITY_KEY"]\n});\n\nexport const GET = endpoint;\nexport const POST = endpoint;`;
const DENO_SCRIPT = `import * as restate from '@restatedev/restate-sdk/fetch';\n\nDeno.serve(\n\trestate.createEndpointHandler({\n\t\tservices: [myService],\n\t\tidentityKeys: ["IDENTITY_KEY"],\n\t\tbidirectional: true\n\t})\n);`;
const NODE_SCRIPT = `import * as restate from '@restatedev/restate-sdk';\n\nrestate.serve({\n  services: [myService],\n  identityKeys: ["IDENTITY_KEY"]\n});`;

function getHttpScript(
  targetType?: 'lambda' | 'deno' | 'cloudflare-worker' | 'vercel' | 'tunnel',
) {
  switch (targetType) {
    case 'cloudflare-worker':
      return CLOUDFLARE_SCRIPT;
    case 'vercel':
      return VERCEL_SCRIPT;
    case 'deno':
      return DENO_SCRIPT;

    default:
      return NODE_SCRIPT;
  }
}
function getDescription(
  targetType?: 'lambda' | 'deno' | 'cloudflare-worker' | 'vercel' | 'tunnel',
) {
  switch (targetType) {
    case 'cloudflare-worker':
      return 'An example in TypeScript for Cloudflare Worker is shown below.';
    case 'vercel':
      return 'An example in TypeScript for Vercel is shown below.';
    case 'deno':
      return 'An example in TypeScript for Deno is shown below.';

    default:
      return 'An example in TypeScript for Node.js is shown below.';
  }
}

export function Helper({
  isLambda,
  isTunnel,
}: {
  isLambda: boolean;
  isTunnel: boolean;
}) {
  const isOnboarding = useOnboarding();
  const { identityKey, awsRolePolicy, OnboardingGuide } = useRestateContext();
  const { targetType, endpoint } = useRegisterDeploymentContext();
  const templates = OnboardingGuide ? (
    <OnboardingGuide
      stage={
        isLambda
          ? 'view-template-lambda'
          : isTunnel
            ? 'view-template-tunnel'
            : 'view-template-http'
      }
      endpoint={endpoint}
      className="-mx-6 mt-2 -mb-6 px-6"
    />
  ) : null;
  if (isOnboarding) {
    return templates;
  }

  if (!isLambda && !isTunnel && identityKey) {
    const copyText = getHttpScript(targetType).replace(
      'IDENTITY_KEY',
      String(identityKey?.value),
    );
    return (
      <>
        <Container
          title={
            <div className="z[2] mb-1.5 flex items-center gap-0.5 px-0 font-sans text-sm">
              <Icon name={IconName.ShieldCheck} className="h-4 w-4" />
              Secure your services.{' '}
              {identityKey.url && (
                <Link
                  target="_blank"
                  href={identityKey.url}
                  variant="secondary"
                  className="text-sky-600"
                >
                  Learn more…
                </Link>
              )}
            </div>
          }
        >
          <div className="mb-3 px-1.5 font-sans text-0.5xs text-gray-500">
            Use the provided identity key to ensure your service only accepts
            requests from your Restate environment. {getDescription(targetType)}
          </div>
          <Code className="relative rounded-sm bg-black/4 py-1.5! text-xs">
            <Snippet language="typescript">
              {getHttpScript(targetType).replace(
                'IDENTITY_KEY',
                identityKey.value,
              )}
              <SnippetCopy copyText={copyText} />
            </Snippet>
          </Code>
        </Container>
        {templates}
      </>
    );
  }
  if (isLambda && awsRolePolicy) {
    return (
      <>
        <Container
          title={
            <div className="z[2] mb-1.5 flex items-center gap-0.5 px-0 font-sans text-sm">
              <Icon name={IconName.ShieldCheck} className="h-4 w-4" />
              Secure your services.{' '}
              {awsRolePolicy.url && (
                <Link
                  target="_blank"
                  href={awsRolePolicy.url}
                  variant="secondary"
                  className="text-sky-600"
                >
                  Learn more…
                </Link>
              )}
            </div>
          }
        >
          <div className="mb-3 px-1.5 font-sans text-0.5xs text-gray-500">
            Create a role in your AWS account that can be assumed, has
            permission to invoke your Lambda, and includes the trust policy
            below.
          </div>
          <Code className="relative rounded-sm bg-black/4 py-1.5! text-xs">
            <Snippet language="json">
              {awsRolePolicy.value}
              <SnippetCopy copyText={awsRolePolicy.value} />
            </Snippet>
          </Code>
        </Container>
        {templates}
      </>
    );
  }

  return null;
}
