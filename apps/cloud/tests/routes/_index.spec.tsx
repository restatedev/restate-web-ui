import { createRemixStub } from '@remix-run/testing';
import { render, screen, waitFor } from '@testing-library/react';
import Component from '../../app/routes/accounts';

test('renders loader data', async () => {
  const RemixStub = createRemixStub([
    {
      path: '/',
      Component,
    },
  ]);

  render(<RemixStub />);

  await waitFor(() => screen.findByRole('heading', { name: 'Hello restate!' }));
});
