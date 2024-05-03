import {
  ClientLoaderFunctionArgs,
  useLoaderData,
  defer,
  Await,
  useAsyncValue,
} from '@remix-run/react';
import {
  describeApiKey,
  listApiKeys,
} from '@restate/data-access/cloud/api-client';
import { Suspense } from 'react';
import invariant from 'tiny-invariant';
import { clientAction } from './action';
import { listApiKeysWithCache } from './apis';
import { ApiKeyItem } from './ApiKeyItem';
import { DeleteAPIKey } from './DeleteAPIKey';
import { CreateApiKey } from './CreateApiKey';
import { ErrorBanner } from '@restate/ui/error';

const clientLoader = async ({ request, params }: ClientLoaderFunctionArgs) => {
  const accountId = params.accountId;
  const environmentId = params.environmentId;
  invariant(accountId, 'Missing accountId param');
  invariant(environmentId, 'Missing environmentId param');

  const apiKeysWithDetailsPromises = listApiKeysWithCache
    .fetch({
      accountId,
      environmentId,
    })
    .then((response) => {
      if (response.error) {
        return response;
      }
      const apiKeys = response.data?.apiKeys ?? [];
      return apiKeys
        .map(({ keyId }) => ({
          [keyId]: describeApiKey({
            accountId,
            environmentId,
            keyId,
          }),
        }))
        .reduce((p, c) => ({ ...p, ...c }), {});
    });

  return defer({
    apiKeysWithDetailsPromises,
  });
};

function Component() {
  const { apiKeysWithDetailsPromises } = useLoaderData<typeof clientLoader>();

  return (
    <div className="grid gap-x-10 gap-y-4 sm:grid-cols-[20ch_1fr]">
      <div>
        <h2 className="text-base font-semibold leading-7 text-gray-900">
          API keys
        </h2>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          You will need an API key to interact with your restate Cloud instance.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Suspense fallback={<LoadingKeys />}>
          <Await resolve={apiKeysWithDetailsPromises}>
            <APIKeys />
          </Await>
        </Suspense>
        <DeleteAPIKey />
        <div>
          <CreateApiKey />
        </div>
      </div>
    </div>
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

function APIKeys() {
  const apiKeysWithDetails = useAsyncValue() as
    | Record<Exclude<string, 'error'>, ReturnType<typeof describeApiKey>>
    | Pick<Awaited<ReturnType<typeof listApiKeys>>, 'error'>;
  if (!isLoadedKeys(apiKeysWithDetails)) {
    return <ErrorBanner errors={[new Error('Failed to load API keys.')]} />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {Object.keys(apiKeysWithDetails).map((keyId) => (
        <Suspense fallback={<LoadingKey />} key={keyId}>
          <Await resolve={apiKeysWithDetails[keyId]}>
            <ApiKeyItem keyId={keyId} />
          </Await>
        </Suspense>
      ))}
    </ul>
  );
}

function LoadingKeys() {
  return (
    <div className="flex flex-col gap-2">
      <LoadingKey />
      <LoadingKey />
      <LoadingKey />
      <LoadingKey />
    </div>
  );
}
function LoadingKey() {
  return (
    <div className="animate-pulse bg-slate-200 rounded-xl h-[4.375rem] w-full" />
  );
}
export const settings = { clientAction, clientLoader, Component };
