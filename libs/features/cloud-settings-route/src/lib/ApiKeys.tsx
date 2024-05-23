import { Await, useAsyncValue, useLoaderData } from '@remix-run/react';
import {
  describeApiKey,
  listApiKeys,
} from '@restate/data-access/cloud/api-client';
import { ErrorBanner } from '@restate/ui/error';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { Suspense, PropsWithChildren } from 'react';
import { ApiKeyItem } from './ApiKeyItem';
import { CreateApiKey } from './CreateApiKey';
import { DeleteAPIKey } from './DeleteAPIKey';
import { clientLoader } from './loader';

export function ApiKeys() {
  const { apiKeysWithDetailsPromises } = useLoaderData<typeof clientLoader>();

  return (
    <Section>
      <SectionTitle>
        API keys
        <p>
          To interact with your restate Cloud instance using methods other than
          the restate CLI, you will need an API key.
        </p>
      </SectionTitle>
      <SectionContent className="flex flex-col gap-2">
        <Suspense fallback={<LoadingKeys />}>
          <Await resolve={apiKeysWithDetailsPromises}>
            <APIKeysList>
              <div>
                <CreateApiKey />
              </div>
              <DeleteAPIKey />
            </APIKeysList>
          </Await>
        </Suspense>
      </SectionContent>
    </Section>
  );
}

function isLoadedKeys(
  response:
    | Record<Exclude<string, 'error'>, ReturnType<typeof describeApiKey>>
    | Pick<Awaited<ReturnType<typeof listApiKeys>>, 'error'>
): response is Record<
  Exclude<string, 'error'>,
  ReturnType<typeof describeApiKey>
> {
  return !response.error;
}

function APIKeysList({ children }: PropsWithChildren<object>) {
  const apiKeysWithDetails = useAsyncValue() as
    | Record<Exclude<string, 'error'>, ReturnType<typeof describeApiKey>>
    | Pick<Awaited<ReturnType<typeof listApiKeys>>, 'error'>;

  if (!isLoadedKeys(apiKeysWithDetails)) {
    return <ErrorBanner errors={[new Error('Failed to load API keys.')]} />;
  }

  return (
    <>
      {children}
      <ul className="flex flex-col gap-0 shadow-sm rounded-xl">
        {Object.keys(apiKeysWithDetails).map((keyId) => (
          <Suspense fallback={<LoadingKey />} key={keyId}>
            <Await resolve={apiKeysWithDetails[keyId]}>
              <ApiKeyItem keyId={keyId} />
            </Await>
          </Suspense>
        ))}
      </ul>
    </>
  );
}

function LoadingKeys() {
  return (
    <div className="flex flex-col">
      <LoadingKey />
      <LoadingKey />
      <LoadingKey />
    </div>
  );
}
function LoadingKey() {
  return (
    <div className="animate-pulse bg-slate-200 h-[4.375rem] w-full first:rounded-t-xl last:rounded-b-xl border border-b-0 last:border-b border-gray-100" />
  );
}
