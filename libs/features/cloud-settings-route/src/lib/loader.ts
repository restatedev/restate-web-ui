import { ClientLoaderFunctionArgs, defer } from '@remix-run/react';
import { describeApiKey } from '@restate/data-access/cloud/api-client';
import invariant from 'tiny-invariant';
import { describeEnvironmentWithCache } from '@restate/features/cloud/environments-route';
import { describeApiKeyWithCache } from './apis';

export const clientLoader = async ({
  request,
  params,
}: ClientLoaderFunctionArgs) => {
  const accountId = params.accountId;
  const environmentId = params.environmentId;
  invariant(accountId, 'Missing accountId param');
  invariant(environmentId, 'Missing environmentId param');

  const apiKeysWithDetailsPromise = describeEnvironmentWithCache
    .fetch({
      accountId,
      environmentId,
    })
    .then((response) => {
      if (response.error) {
        return {} as Record<string, Awaited<ReturnType<typeof describeApiKey>>>;
      }
      const apiKeys = response.data?.apiKeys ?? [];
      return Promise.all(
        apiKeys.map(({ keyId }) =>
          describeApiKeyWithCache
            .fetch({
              accountId,
              environmentId,
              keyId,
            })
            .then((response) => ({ [keyId]: response }))
        )
      ).then((response) => response.reduce((p, c) => ({ ...p, ...c }), {}));
    });

  return defer({
    apiKeysWithDetailsPromise,
  });
};
