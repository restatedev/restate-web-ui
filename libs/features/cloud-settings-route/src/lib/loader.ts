import { ClientLoaderFunctionArgs, defer } from '@remix-run/react';
import { describeApiKey } from '@restate/data-access/cloud/api-client';
import invariant from 'tiny-invariant';
import { listApiKeysWithCache } from './apis';

export const clientLoader = async ({
  request,
  params,
}: ClientLoaderFunctionArgs) => {
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
