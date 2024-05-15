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
import { PropsWithChildren, Suspense, useState } from 'react';
import invariant from 'tiny-invariant';
import { clientAction } from './action';
import { listApiKeysWithCache } from './apis';
import { ApiKeyItem } from './ApiKeyItem';
import { DeleteAPIKey } from './DeleteAPIKey';
import { CreateApiKey } from './CreateApiKey';
import { ErrorBanner } from '@restate/ui/error';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { useEnvironmentParam } from '@restate/features/cloud/routes-utils';

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
  const [isCopied, setIsCopied] = useState(false);
  const environmentId = useEnvironmentParam();

  return (
    <div className="grid gap-x-10 gap-y-4 sm:grid-cols-[20ch_1fr]">
      <div>
        <h2 className="text-base font-semibold leading-7 text-gray-900">CLI</h2>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          Connect restate CLI to your restate cloud environment.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-start font-mono [overflow-wrap:anywhere] rounded-xl border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] text-xs p-2">
          <code className="flex-auto px-2 flex gap-2 flex-col py-2">
            <span className="text-green-800">
              # npm install --global @restatedev/restate
            </span>
            <span>
              <span className="text-blue-700">export</span>{' '}
              <span className="">RESTATE_HOST</span>=
              <span className="text-red-700">
                {environmentId!.split('env_')[1]}
                .env.dev.restate.cloud
              </span>
            </span>
            <span>
              <span className="text-blue-700">export</span>{' '}
              <span className="">RESTATE_HOST_SCHEME</span>=
              <span className="text-red-700">https</span>
            </span>
            <span>
              <span className="">restate</span>{' '}
              <span className="text-red-700">whoami</span>
            </span>
          </code>
          <Button
            variant="icon"
            className="flex-shrink-0 flex items-center gap-1 p-2"
            onClick={() => {
              navigator.clipboard.writeText(
                `export RESTATE_HOST=${
                  environmentId!.split('env_')[1]
                }.env.dev.restate.cloud\nexport RESTATE_HOST_SCHEME=https\nrestate whoami`
              );
              setIsCopied(true);
              setTimeout(() => {
                setIsCopied(false);
              }, 1000);
            }}
          >
            {isCopied ? (
              <Icon name={IconName.Check} />
            ) : (
              <Icon name={IconName.Copy} />
            )}
          </Button>
        </div>
      </div>
      <div className="mt-10">
        <h2 className="text-base font-semibold leading-7 text-gray-900">
          API keys
        </h2>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          You will need an API key to interact with your restate Cloud instance.
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
