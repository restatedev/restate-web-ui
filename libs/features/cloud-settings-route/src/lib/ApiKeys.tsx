import {
  Await,
  useAsyncValue,
  useLoaderData,
  useRouteLoaderData,
} from '@remix-run/react';
import { describeEnvironment } from '@restate/data-access/cloud/api-client';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { Suspense, PropsWithChildren } from 'react';
import { ApiKeyItem } from './ApiKeyItem';
import { CreateApiKey } from './CreateApiKey';
import { DeleteAPIKey } from './DeleteAPIKey';
import { clientLoader } from './loader';
import { useEnvironmentParam } from '@restate/features/cloud/routes-utils';
import invariant from 'tiny-invariant';
import { environments } from '@restate/features/cloud/environments-route';
import { Loading } from './Loading';

export function ApiKeys({ isLoading }: { isLoading: boolean }) {
  const environmentId = useEnvironmentParam();

  invariant(environmentId, 'Missing environmentId param');
  const environmentsResponse = useRouteLoaderData<
    typeof environments.clientLoader
  >('routes/accounts.$accountId.environments');
  const environmentDetailsPromise = environmentsResponse?.[environmentId];

  return (
    <Section>
      <SectionTitle>
        API keys
        <p>
          To interact with your restate Cloud environment programmatically, you
          will need an API key.
        </p>
      </SectionTitle>
      <SectionContent className="flex flex-col gap-2 relative">
        <Suspense fallback={<LoadingKeys />}>
          {isLoading ? (
            <LoadingKeys />
          ) : (
            <Await resolve={environmentDetailsPromise}>
              <APIKeysList />
            </Await>
          )}
        </Suspense>
      </SectionContent>
    </Section>
  );
}

function APIKeysList({ children }: PropsWithChildren<object>) {
  const environmentDetails = useAsyncValue() as Awaited<
    ReturnType<typeof describeEnvironment>
  >;
  const { apiKeysWithDetailsPromise } = useLoaderData<typeof clientLoader>();

  return (
    <>
      <div>
        <CreateApiKey
          hasAnyKeys={(environmentDetails.data?.apiKeys ?? []).length > 0}
        />
      </div>
      <DeleteAPIKey />
      <Suspense fallback={<LoadingKey />}>
        <Await resolve={apiKeysWithDetailsPromise}>
          {(apiKeysWithDetails) => (
            <ul className="flex flex-col gap-0 shadow-sm rounded-xl">
              {(environmentDetails.data?.apiKeys ?? []).map(({ keyId }) => (
                <ApiKeyItem
                  keyId={keyId}
                  key={keyId}
                  apiKeyDetails={apiKeysWithDetails[keyId]?.data}
                />
              ))}
            </ul>
          )}
        </Await>
      </Suspense>
    </>
  );
}

function LoadingKeys() {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-[2.4rem] w-[10.5rem]">
        <Loading className="rounded-xl" />
      </div>
      <div className="flex flex-col">
        <LoadingKey />
        <LoadingKey />
      </div>
    </div>
  );
}
function LoadingKey() {
  return (
    <Loading className="h-[4.375rem] w-full first:rounded-t-xl last:rounded-b-xl  border-b-0 last:border-b border-gray-100 relative" />
  );
}
