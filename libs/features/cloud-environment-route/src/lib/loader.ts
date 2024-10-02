import { json, LoaderFunction } from '@remix-run/cloudflare';
import {
  cloudApi,
  describeEnvironment,
} from '@restate/data-access/cloud/api-client';
import { adminUrlCookie } from '@restate/features/admin-api';
import { dehydrate, QueryClient } from '@tanstack/react-query';
import invariant from 'tiny-invariant';

export const loader: LoaderFunction = async ({ params, request }) => {
  const { accountId, environmentId } = params;
  invariant(accountId, 'Missing accountId param');
  invariant(environmentId, 'Missing environmentId param');
  const headers = request.headers;
  headers.set('Content-Type', 'application/json');

  const queryClient = new QueryClient();
  const environmentDetails = await queryClient.fetchQuery({
    ...cloudApi.describeEnvironment({ accountId, environmentId }),
    queryFn: () =>
      describeEnvironment({
        accountId,
        environmentId,
        headers,
      }).then((response) => response.data),
  });

  return json(
    {
      dehydratedState: dehydrate(queryClient),
    },
    {
      ...(environmentDetails?.adminBaseUrl && {
        headers: {
          'Set-Cookie': await adminUrlCookie.serialize(
            environmentDetails?.adminBaseUrl,
            {
              path: `/api/accounts/${accountId}/environments/${environmentId}/admin`,
            }
          ),
        },
      }),
    }
  );
};
