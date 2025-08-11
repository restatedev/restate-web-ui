import { UnauthorizedError } from '@restate/util/errors';
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  hydrate,
} from '@tanstack/react-query';
import { PropsWithChildren, useState } from 'react';
import { useMatches } from 'react-router';

const useDehydratedState = (queryClient: QueryClient) => {
  const matches = useMatches();

  matches
    .map((match) => (match.data as any)?.dehydratedState)
    .filter(Boolean)
    .forEach((dehydratedState) => {
      hydrate(queryClient, dehydratedState);
    });
};

export function QueryProvider({
  children,
  logOut,
  onError,
  onSettled,
  onSuccess,
}: PropsWithChildren<
  {
    logOut?: (params: { persistRedirectUrl?: boolean }) => void;
  } & NonNullable<ConstructorParameters<typeof QueryCache>[0]>
>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (error instanceof UnauthorizedError) {
              logOut?.({ persistRedirectUrl: true });
            }
            onError?.(error, query);
          },
          onSettled,
          onSuccess,
        }),
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 5 * 60 * 1000,
            retry: false,
            refetchOnMount: false,
            experimental_prefetchInRender: true,
          },
        },
      }),
  );
  useDehydratedState(queryClient);
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
