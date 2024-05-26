import { useRouteLoaderData, Await } from '@remix-run/react';
import { environments } from '@restate/features/cloud/environments-route';
import { useEnvironmentParam } from '@restate/features/cloud/routes-utils';
import { Code, Snippet, SnippetCopy } from '@restate/ui/code';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { Suspense } from 'react';
import invariant from 'tiny-invariant';

export function Http({ isLoading }: { isLoading: boolean }) {
  const environmentId = useEnvironmentParam();

  invariant(environmentId, 'Missing environmentId param');
  const environmentsResponse = useRouteLoaderData<
    typeof environments.clientLoader
  >('routes/accounts.$accountId.environments');
  const environmentDetailsPromise = environmentsResponse?.[environmentId];

  return (
    <Section>
      <SectionTitle>
        HTTP
        <p>
          To invoke your handlers or manage your services over HTTP, simply
          include an API key with your instance URLs.
        </p>
      </SectionTitle>
      <SectionContent className="flex flex-col gap-2">
        <Suspense>
          <Await resolve={environmentDetailsPromise}>
            {(environmentDetails) => (
              <Code>
                <Snippet>
                  # Here is your ingress URL for invoking your handlers (example
                  use case):
                </Snippet>

                <Snippet>
                  curl {environmentDetails?.data?.ingressBaseUrl}
                  /MyService/MyHandler -H "Authorization: Bearer $API_KEY"
                  <SnippetCopy
                    copyText={environmentDetails?.data?.ingressBaseUrl ?? ''}
                  />
                </Snippet>

                <Snippet className="mt-4">
                  # Here is your Admin API URL for managing services,
                  deployments and invocations (example use case):
                </Snippet>
                <Snippet>
                  curl {environmentDetails?.data?.adminBaseUrl}/deployments -H
                  "Authorization: Bearer $API_KEY"
                  <SnippetCopy
                    copyText={environmentDetails?.data?.adminBaseUrl ?? ''}
                  />
                </Snippet>
              </Code>
            )}
          </Await>
        </Suspense>
      </SectionContent>
    </Section>
  );
}
