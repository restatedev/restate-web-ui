import { createRemixStub } from '@remix-run/testing';
import { render, screen, waitFor } from '@testing-library/react';
import Index from '../../app/routes/_index';

test('renders loader data', async () => {
  const RemixStub = createRemixStub([
    {
      path: '/',
      Component: Index,
    },
  ]);

  render(<RemixStub />);

  await waitFor(() =>
    screen.findByRole('heading', { name: 'Welcome to Remix (SPA Mode)' })
  );
});
