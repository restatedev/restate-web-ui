import { useRouteLoaderData, Await } from '@remix-run/react';
import { accounts } from '@restate/features/cloud/accounts-route';
import { environments } from '@restate/features/cloud/environments-route';
import {
  useEnvironmentParam,
  useAccountParam,
} from '@restate/features/cloud/routes-utils';
import { Code, Snippet, SnippetCopy } from '@restate/ui/code';
import {
  Section,
  SectionContent,
  SectionTitle,
} from '@restate/ui/sections-list';
import { Suspense } from 'react';
import invariant from 'tiny-invariant';

export function CLI() {
  const environmentId = useEnvironmentParam();
  const accountId = useAccountParam();
  invariant(environmentId, 'Missing environmentId param');
  const environmentsResponse = useRouteLoaderData<
    typeof environments.clientLoader
  >('routes/accounts.$accountId.environments');
  const accountsResponse =
    useRouteLoaderData<typeof accounts.clientLoader>('routes/accounts');
  const environmentDetailsPromise =
    environmentsResponse?.environmentsWithDetailsPromises[environmentId];
  return (
    <Section>
      <SectionTitle>
        CLI
        <p>Connect restate CLI to your restate cloud environment.</p>
      </SectionTitle>
      <SectionContent className="flex flex-col gap-2">
        <Suspense>
          <Await resolve={environmentDetailsPromise}>
            {(environmentDetails) => {
              const accountName =
                accountsResponse?.accountsList?.data.accounts.find(
                  (account) => account.accountId === accountId
                )?.name;
              const environmentName = environmentDetails?.data?.name;
              return (
                <Code>
                  <Snippet>
                    <span data-comment>
                      # brew install restatedev/tap/restate
                    </span>
                  </Snippet>
                  <Snippet>
                    <span data-comment># restate cloud login</span>
                  </Snippet>
                  <Snippet>
                    <span>
                      <span>restate</span>{' '}
                      <span data-shell-command>cloud env configure </span>
                      <span>
                        {accountName}/{environmentName}
                      </span>
                    </span>
                    <SnippetCopy
                      copyText={`restate cloud env configure ${accountName}/${environmentName}`}
                    />
                  </Snippet>
                </Code>
              );
            }}
          </Await>
        </Suspense>
      </SectionContent>
    </Section>
  );
}
