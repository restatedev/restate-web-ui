import { UnauthorizedError } from '@restate/util/errors';
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  QueryCache,
} from '@tanstack/react-query';
import { PropsWithChildren, useState } from 'react';
import { useDehydratedState } from 'use-dehydrated-state';

export function QueryProvider({
  children,
  logOut,
}: PropsWithChildren<{
  logOut?: (params: { persistRedirectUrl?: boolean }) => void;
}>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (error instanceof UnauthorizedError) {
              logOut?.({ persistRedirectUrl: true });
            }
          },
        }),
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 5 * 60 * 1000,
            retry: false,
            refetchOnMount: false,
          },
        },
      })
  );
  const dehydratedState = useDehydratedState();

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>{children}</HydrationBoundary>
    </QueryClientProvider>
  );
}
