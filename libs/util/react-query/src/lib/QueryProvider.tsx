import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';

export function QueryProvider({
  children,
  queryClient,
}: PropsWithChildren<{
  queryClient: QueryClient;
}>) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
