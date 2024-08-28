import { type components } from '../index'; // generated by openapi-typescript
import { QueryKey } from '@tanstack/react-query';
import ky, { HTTPError } from 'ky';
import { UnauthorizedError } from './UnauthorizedError';

function listAccounts() {
  return {
    queryKey: ['listAccounts', '/api/accounts'],
    queryFn: async ({
      queryKey,
      signal,
    }: {
      queryKey: QueryKey;
      signal: AbortSignal;
    }) => {
      const [_, url] = queryKey;
      try {
        return await ky
          .get(String(url), { signal })
          .json<components['schemas']['ListAccountsResponse']>();
      } catch (error) {
        if (error instanceof HTTPError && error.response.status === 401) {
          throw new UnauthorizedError();
        } else {
          throw error;
        }
      }
    },
  };
}

function listEnvironments({ accountId }: { accountId: string }) {
  return {
    queryKey: ['listEnvironments', `/api/accounts/${accountId}/environments`],
    queryFn: async ({
      queryKey,
      signal,
    }: {
      queryKey: QueryKey;
      signal: AbortSignal;
    }) => {
      const [_, url] = queryKey;
      try {
        return await ky
          .get(String(url), { signal })
          .json<components['schemas']['ListEnvironmentsResponse']>();
      } catch (error) {
        if (error instanceof HTTPError && error.response.status === 401) {
          throw new UnauthorizedError();
        } else {
          throw error;
        }
      }
    },
  };
}

function describeEnvironment({
  accountId,
  environmentId,
}: {
  accountId: string;
  environmentId: string;
}) {
  return {
    queryKey: [
      'describeEnvironment',
      `/api/accounts/${accountId}/environments/${environmentId}`,
    ],
    queryFn: async ({
      queryKey,
      signal,
    }: {
      queryKey: QueryKey;
      signal: AbortSignal;
    }) => {
      const [_, url] = queryKey;
      try {
        return await ky
          .get(String(url), { signal })
          .json<components['schemas']['DescribeEnvironmentResponse']>();
      } catch (error) {
        if (error instanceof HTTPError && error.response.status === 401) {
          throw new UnauthorizedError();
        } else {
          throw error;
        }
      }
    },
  };
}

function describeApiKey({
  accountId,
  environmentId,
  keyId,
}: {
  accountId: string;
  environmentId: string;
  keyId: string;
}) {
  return {
    queryKey: [
      'describeApiKey',
      `/api/accounts/${accountId}/environments/${environmentId}/keys/${keyId}`,
    ],
    queryFn: async ({
      queryKey,
      signal,
    }: {
      queryKey: QueryKey;
      signal: AbortSignal;
    }) => {
      const [_, url] = queryKey;
      try {
        return await ky
          .get(String(url), { signal })
          .json<components['schemas']['DescribeApiKeyResponse']>();
      } catch (error) {
        if (error instanceof HTTPError && error.response.status === 401) {
          throw new UnauthorizedError();
        } else {
          throw error;
        }
      }
    },
  };
}

export const cloudApi = {
  listEnvironments,
  listAccounts,
  describeEnvironment,
  describeApiKey,
};
