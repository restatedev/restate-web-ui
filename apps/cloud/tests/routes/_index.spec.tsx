import { createRemixStub } from '@remix-run/testing';
import { render, screen, waitFor } from '@testing-library/react';
import Component from '../../app/routes/accounts';
import { AppLoadContext, json } from '@remix-run/cloudflare';
import { LayoutProvider } from '@restate/ui/layout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

test('renders loader data', async () => {
  const RemixStub = createRemixStub(
    [
      {
        path: '/',
        Component,
        loader: () =>
          json({
            accounts: [],
          }),
      },
    ],
    {} as AppLoadContext
  );

  render(
    <RemixStub
      future={{ v3_fetcherPersist: true, v3_relativeSplatPath: true }}
    />,
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={new QueryClient()}>
          <LayoutProvider>{children}</LayoutProvider>
        </QueryClientProvider>
      ),
    }
  );
  await waitFor(() =>
    screen.findByRole('heading', { name: 'Welcome to Cloud!' })
  );
});
