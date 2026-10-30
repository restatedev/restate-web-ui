import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RegisterDeploymentDialog } from './Dialog';

const toHttp = vi.fn(
  (name: string, url?: string, mode?: string) =>
    `https://tunnel.example:9080/env/${name}/${mode === 'in-process' ? 'http/in-process/9080/' : `http/${url}`}`,
);
const register = vi.fn();

vi.mock('@restate/features-restate-context', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/features-restate-context')
  >()),
  useRestateContext: () => ({
    tunnel: { isEnabled: true, toHttp, fromHttp: () => undefined },
  }),
}));

vi.mock('@restate/data-access-admin-api-hooks', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/data-access-admin-api-hooks')
  >()),
  useListDeployments: () => ({
    data: { deployments: new Map() },
    refetch: vi.fn(),
  }),
  useRegisterDeployment: () => ({
    mutate: register,
    reset: vi.fn(),
    isPending: false,
    error: null,
  }),
  useUpdateDeployment: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

afterEach(() => {
  cleanup();
  register.mockClear();
  toHttp.mockClear();
});

function open(search: string) {
  const router = createMemoryRouter(
    [{ path: '*', element: <RegisterDeploymentDialog /> }],
    { initialEntries: [`/${search}`] },
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe('RegisterDeploymentDialog', () => {
  it('pre-selects the in-process sub-mode for a tunnel:// prefill and registers the constant tail', async () => {
    const user = open('?register-deployment=tunnel://quiet-amber-otter');

    const name = await screen.findByPlaceholderText('Deployment name');
    expect(name).toHaveValue('quiet-amber-otter');
    expect(name).toHaveFocus();
    expect(screen.getByRole('radio', { name: /In-process/ })).toBeChecked();
    expect(
      screen.getByRole('radio', { name: 'Connected / tunneled' }),
    ).toBeChecked();
    expect(screen.getByPlaceholderText(/Destination/)).not.toBeRequired();
    expect(screen.getByText('Connected service')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Next/ }));

    expect(toHttp).toHaveBeenLastCalledWith(
      'quiet-amber-otter',
      undefined,
      'in-process',
    );
    expect(register).toHaveBeenCalledWith({
      body: expect.objectContaining({
        uri: 'https://tunnel.example:9080/env/quiet-amber-otter/http/in-process/9080/',
        use_http_11: false,
        dry_run: true,
      }),
    });
  });

  it('keeps the destination for the standalone tunnel client', async () => {
    const user = open('?register-deployment=tunnel://my-tunnel');

    await user.click(
      await screen.findByRole('radio', { name: /Standalone tunnel client/ }),
    );

    const destination = screen.getByPlaceholderText(/Destination/);
    expect(destination).toBeRequired();
    expect(screen.getByText('Tunnel client')).toBeInTheDocument();
    await user.type(destination, 'http://localhost:9080');
    await user.click(screen.getByRole('button', { name: /Next/ }));

    expect(register).toHaveBeenCalledWith({
      body: expect.objectContaining({
        uri: 'https://tunnel.example:9080/env/my-tunnel/http/http://localhost:9080',
      }),
    });
  });

  it('switches to the in-process sub-mode when tunnel:// is typed in the endpoint field', async () => {
    const user = open('?register-deployment=true');

    await user.type(
      await screen.findByPlaceholderText('http://localhost:9080'),
      'tunnel://greeter',
    );

    expect(screen.getByPlaceholderText('Deployment name')).toHaveValue(
      'greeter',
    );
    expect(screen.getByRole('radio', { name: /In-process/ })).toBeChecked();
  });
});
