import { createRemixStub } from '@remix-run/testing';
import { render, screen, waitFor } from '@testing-library/react';
import Index, { clientLoader } from '../../app/routes/_index';

test('renders loader data', async () => {
  const RemixStub = createRemixStub([
    {
      path: '/',
      Component: Index,
      loader: clientLoader,
    },
    {
      path: '/overview',
      Component: () => <h1>Overview</h1>,
    },
  ]);

  render(<RemixStub />);

  await waitFor(() => screen.findByText('Overview'));
});
