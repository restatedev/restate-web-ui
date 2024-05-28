import { useRouteLoaderData, Await } from '@remix-run/react';
import { accounts } from '@restate/features/cloud/accounts-route';
import { environments } from '@restate/features/cloud/environments-route';
import {
  useEnvironmentParam,
  useAccountParam,
} from '@restate/features/cloud/routes-utils';
import { Code, Snippet, SnippetCopy } from '@restate/ui/code';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { Suspense } from 'react';
import invariant from 'tiny-invariant';
import { Loading } from './Loading';
import { Icon, IconName } from '@restate/ui/icons';
import { LearnMore } from './LearnMore';

export function CLI({ isLoading }: { isLoading: boolean }) {
  const environmentId = useEnvironmentParam();
  const accountId = useAccountParam();
  invariant(environmentId, 'Missing environmentId param');
  const environmentsResponse = useRouteLoaderData<
    typeof environments.clientLoader
  >('routes/accounts.$accountId.environments');
  const accountsResponse =
    useRouteLoaderData<typeof accounts.clientLoader>('routes/accounts');
  const environmentDetailsPromise = environmentsResponse?.[environmentId];
  return (
    <Section>
      <SectionTitle>
        <span className="inline-flex items-center gap-2">
          <Icon
            name={IconName.Cli}
            className="w-[1.125em] h-[1.125em] text-gray-700"
          />
          CLI
        </span>
        <p>
          Connect restate CLI to your restate cloud environment.{' '}
          <LearnMore href="https://docs.restate.dev" />
        </p>
      </SectionTitle>
      <SectionContent className="flex flex-col gap-2 relative min-h-[13.3rem]">
        <Suspense fallback={<Loading className="rounded-xl" />}>
          {isLoading ? (
            <Loading className="rounded-xl" />
          ) : (
            <Await resolve={environmentDetailsPromise}>
              {(environmentDetails) => {
                const accountName =
                  accountsResponse?.accountsList?.data.accounts.find(
                    (account) => account.accountId === accountId
                  )?.name;
                const environmentName = environmentDetails?.data?.name;
                return (
                  <Code>
                    <Snippet># brew install restatedev/tap/restate</Snippet>
                    <Snippet>
                      restate cloud login
                      <SnippetCopy copyText="restate cloud login" />
                    </Snippet>
                    <br />
                    <Snippet>
                      restate cloud env configure {accountName}/
                      {environmentName}
                      <SnippetCopy
                        copyText={`restate cloud env configure ${accountName}/${environmentName}`}
                      />
                    </Snippet>
                    <br />
                    <Snippet>
                      # You can also do local development against an
                      authenticating proxy
                    </Snippet>
                    <Snippet>
                      restate cloud env proxy
                      <SnippetCopy copyText="restate cloud env proxy curl" />
                    </Snippet>
                    <Snippet>
                      # curl http://localhost:8080/MyService/MyHandler
                    </Snippet>
                  </Code>
                );
              }}
            </Await>
          )}
        </Suspense>
      </SectionContent>
    </Section>
  );
}
