import { useEnvironmentDetails } from '@restate/features/cloud/environments-route';
import { useEnvironmentParam } from '@restate/features/cloud/routes-utils';
import { Code, Snippet, SnippetCopy } from '@restate/ui/code';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import invariant from 'tiny-invariant';
import { Loading } from './Loading';
import { Icon, IconName } from '@restate/ui/icons';
import { LearnMore } from './LearnMore';

export function Http({ isLoading }: { isLoading: boolean }) {
  const environmentId = useEnvironmentParam();

  invariant(environmentId, 'Missing environmentId param');
  const environmentDetails = useEnvironmentDetails();

  return (
    <Section>
      <SectionTitle>
        <span className="inline-flex items-center gap-2">
          <Icon
            name={IconName.Http}
            className="w-[1.125em] h-[1.125em] text-gray-700"
          />
          HTTP
        </span>
        <p>
          To invoke your handlers over HTTP, simply include an API key with your
          instance URLs.{' '}
          <LearnMore href="https://docs.restate.dev/deploy/cloud#api-tokens" />
        </p>
      </SectionTitle>
      <SectionContent className="flex flex-col gap-2 relative min-h-[10rem]">
        {environmentDetails.isLoading || isLoading ? (
          <Loading className="rounded-xl" />
        ) : (
          <Code>
            <Snippet>
              # Here is your Ingress URL for invoking your handlers:
            </Snippet>

            <Snippet>
              curl {environmentDetails?.data?.ingressBaseUrl}
              /MyService/MyHandler -H "Authorization: Bearer $API_KEY"
              <SnippetCopy
                copyText={environmentDetails?.data?.ingressBaseUrl ?? ''}
              />
            </Snippet>

            <Snippet className="mt-4">
              # Here is your Admin API URL for managing services, deployments
              and invocations:
            </Snippet>
            <Snippet>
              curl {environmentDetails?.data?.adminBaseUrl}/health -H
              "Authorization: Bearer $API_KEY"
              <SnippetCopy
                copyText={environmentDetails?.data?.adminBaseUrl ?? ''}
              />
            </Snippet>
          </Code>
        )}
      </SectionContent>
    </Section>
  );
}
