import { createRoutesStub } from 'react-router';
import { render, screen, waitFor } from '@testing-library/react';
import Index, { clientLoader } from '../../app/routes/_index';

test('renders loader data', async () => {
  const RemixStub = createRoutesStub([
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
