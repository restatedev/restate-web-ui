import {
  ClientLoaderFunctionArgs,
  useLoaderData,
  defer,
  Await,
  useAsyncValue,
  useRouteLoaderData,
} from '@remix-run/react';
import {
  describeApiKey,
  listApiKeys,
} from '@restate/data-access/cloud/api-client';
import { PropsWithChildren, Suspense } from 'react';
import invariant from 'tiny-invariant';
import { clientAction } from './action';
import { listApiKeysWithCache } from './apis';
import { ApiKeyItem } from './ApiKeyItem';
import { DeleteAPIKey } from './DeleteAPIKey';
import { CreateApiKey } from './CreateApiKey';
import { ErrorBanner } from '@restate/ui/error';
import {
  useAccountParam,
  useEnvironmentParam,
} from '@restate/features/cloud/routes-utils';
import { environments } from '@restate/features/cloud/environments-route';
import { accounts } from '@restate/features/cloud/accounts-route';
import { Code, Snippet, SnippetCopy } from '@restate/ui/code';

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

function CLI() {
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
    <>
      <div>
        <h2 className="text-base font-semibold leading-7 text-gray-900">CLI</h2>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          Connect restate CLI to your restate cloud environment.
        </p>
      </div>
      <div className="flex flex-col gap-2">
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
                      <span data-shell-command>
                        cloud env configure {accountName}/{environmentName}
                      </span>
                      <span>{}</span>
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
      </div>
    </>
  );
}

function Http() {
  const environmentId = useEnvironmentParam();

  invariant(environmentId, 'Missing environmentId param');
  const environmentsResponse = useRouteLoaderData<
    typeof environments.clientLoader
  >('routes/accounts.$accountId.environments');
  const environmentDetailsPromise =
    environmentsResponse?.environmentsWithDetailsPromises[environmentId];

  return (
    <>
      <div className="mt-10">
        <h2 className="text-base font-semibold leading-7 text-gray-900">
          HTTP
        </h2>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          To invoke your handlers or manage your services, deployments, and
          invocations in this environment over HTTP, please use this URLs.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:mt-10">
        <Suspense>
          <Await resolve={environmentDetailsPromise}>
            {(environmentDetails) => (
              <>
                <Code>
                  <Snippet>
                    <span data-comment>
                      # Here is your ingress URL for invoking your handlers
                      (example use case):
                    </span>
                  </Snippet>
                  <Snippet>
                    {`curl ${environmentDetails?.data?.ingressBaseUrl}/MyService/MyHandler -H "Authorization: Bearer $MY_API_KEY"`}
                    <SnippetCopy
                      copyText={environmentDetails?.data?.ingressBaseUrl ?? ''}
                    />
                  </Snippet>
                </Code>
                <Code>
                  <Snippet>
                    <span data-comment>
                      # Here is your Admin API URL for managing services,
                      deployments and invocations (example use case):
                    </span>
                  </Snippet>
                  <Snippet>
                    {`curl ${environmentDetails?.data?.adminBaseUrl}/deployments -H "Authorization: Bearer $MY_API_KEY"`}
                    <SnippetCopy
                      copyText={environmentDetails?.data?.adminBaseUrl ?? ''}
                    />
                  </Snippet>
                </Code>
              </>
            )}
          </Await>
        </Suspense>
      </div>
    </>
  );
}

function Component() {
  const { apiKeysWithDetailsPromises } = useLoaderData<typeof clientLoader>();
  const environmentId = useEnvironmentParam();
  invariant(environmentId, 'Missing environmentId param');

  return (
    <div className="grid gap-x-10 gap-y-4 sm:grid-cols-[20ch_1fr]">
      <CLI />
      <Http />
      <div className="mt-10">
        <h2 className="text-base font-semibold leading-7 text-gray-900">
          API keys
        </h2>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          To interact with your restate Cloud instance using methods other than
          the restate CLI, you will need an API key.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:mt-10">
        <Suspense fallback={<LoadingKeys />}>
          <Await resolve={apiKeysWithDetailsPromises}>
            <APIKeys>
              <div>
                <CreateApiKey />
              </div>
              <DeleteAPIKey />
            </APIKeys>
          </Await>
        </Suspense>
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

function APIKeys({ children }: PropsWithChildren<object>) {
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

export const settings = { clientAction, clientLoader, Component };
