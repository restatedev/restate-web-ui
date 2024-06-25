import { createRemixStub } from '@remix-run/testing';
import { render, screen, waitFor } from '@testing-library/react';
import Component from '../../app/routes/accounts';
import { AppLoadContext, json } from '@remix-run/cloudflare';
import { LayoutProvider } from '@restate/ui/layout';

test('renders loader data', async () => {
  const RemixStub = createRemixStub(
    [
      {
        path: '/',
        Component,
        loader: () => json({ accountList: [] }),
      },
    ],
    {} as AppLoadContext
  );

  render(
    <RemixStub
      future={{ v3_fetcherPersist: true, v3_relativeSplatPath: true }}
    />,
    { wrapper: LayoutProvider }
  );
  await waitFor(() =>
    screen.findByRole('heading', { name: 'Welcome to Cloud!' })
  );
});
