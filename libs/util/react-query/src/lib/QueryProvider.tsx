import {
  QueryClient,
  QueryClientProvider,
  hydrate,
} from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
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
  queryClient,
}: PropsWithChildren<{
  queryClient: QueryClient;
}>) {
  useDehydratedState(queryClient);
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
