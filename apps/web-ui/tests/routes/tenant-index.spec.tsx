import { waitFor } from '@testing-library/react';
import { createMemoryRouter, type LoaderFunction } from 'react-router';
import { clientLoader } from '../../app/routes/tenant-index';

it.each(['acme', 'customer%20one', 'customer%2Fone'])(
  'redirects tenant %s to invocations under the UI basename',
  async (scope) => {
    const router = createMemoryRouter(
      [
        { path: '/tenants/:scope', loader: clientLoader as LoaderFunction },
        { path: '/tenants/:scope/invocations', element: null },
      ],
      {
        basename: '/ui',
        initialEntries: [`/ui/tenants/${scope}/?service=Greeter`],
      },
    );
    try {
      await waitFor(() => {
        expect(router.state.location.pathname).toBe(
          `/ui/tenants/${scope}/invocations`,
        );
        expect(router.state.location.search).toBe('?service=Greeter');
      });
    } finally {
      router.dispose();
    }
  },
);
