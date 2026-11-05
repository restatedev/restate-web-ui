import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  RegisterDeploymentDialog,
  TriggerRegisterDeploymentDialog,
} from './Dialog';

const toHttp = vi.fn(
  (name: string, url?: string, mode?: string) =>
    `https://tunnel.example:9080/env/${name}/${mode === 'in-process' ? 'http/in-process/9080/' : `http/${url}`}`,
);
const register = vi.fn();
const host: {
  OnboardingGuide?: (props: { stage: string; endpoint?: string }) => ReactNode;
  isTunnelEnabled: boolean;
} = { isTunnelEnabled: true };

vi.mock('@restate/features-restate-context', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/features-restate-context')
  >()),
  useRestateContext: () => ({
    tunnel: host.isTunnelEnabled
      ? { isEnabled: true, toHttp, fromHttp: () => undefined }
      : undefined,
    OnboardingGuide: host.OnboardingGuide,
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
  host.OnboardingGuide = undefined;
  host.isTunnelEnabled = true;
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
  it('opens in connected-service mode for a connect:// prefill and registers the constant tail', async () => {
    const user = open('?register-deployment=connect://greeter-v1');

    const name = await screen.findByPlaceholderText('Deployment name');
    expect(name).toHaveValue('greeter-v1');
    expect(name).toHaveFocus();
    expect(
      screen.getByRole('radio', { name: 'Connected service' }),
    ).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Tunnel' })).not.toBeChecked();
    expect(screen.getByPlaceholderText(/Destination/)).not.toBeRequired();
    expect(screen.getAllByText('Connected service').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /Next/ }));

    expect(toHttp).toHaveBeenLastCalledWith(
      'greeter-v1',
      undefined,
      'in-process',
    );
    expect(register).toHaveBeenCalledWith({
      body: expect.objectContaining({
        uri: 'https://tunnel.example:9080/env/greeter-v1/http/in-process/9080/',
        use_http_11: false,
        dry_run: true,
      }),
    });
  });

  it('opens in tunnel mode for a tunnel:// prefill and keeps the destination', async () => {
    const user = open('?register-deployment=tunnel://my-tunnel');

    expect(await screen.findByRole('radio', { name: 'Tunnel' })).toBeChecked();
    expect(
      screen.getByRole('radio', { name: 'Connected service' }),
    ).not.toBeChecked();
    expect(screen.getByPlaceholderText('Deployment name')).toHaveValue(
      'my-tunnel',
    );
    const destination = screen.getByPlaceholderText(/Destination/);
    expect(destination).toBeRequired();
    await user.type(destination, 'http://localhost:9080');
    await user.click(screen.getByRole('button', { name: /Next/ }));

    expect(register).toHaveBeenCalledWith({
      body: expect.objectContaining({
        uri: 'https://tunnel.example:9080/env/my-tunnel/http/http://localhost:9080',
      }),
    });
  });

  it('switches to connected-service mode when connect:// is typed in the endpoint field', async () => {
    const user = open('?register-deployment=true');

    await user.type(
      await screen.findByPlaceholderText('http://localhost:9080'),
      'connect://greeter',
    );

    expect(screen.getByPlaceholderText('Deployment name')).toHaveValue(
      'greeter',
    );
    expect(
      screen.getByRole('radio', { name: 'Connected service' }),
    ).toBeChecked();
  });

  it('asks only for the deployment name when Connected service is picked', async () => {
    const user = open('?register-deployment=true');

    await user.click(
      await screen.findByRole('radio', { name: 'Connected service' }),
    );
    await user.type(
      screen.getByPlaceholderText('Deployment name'),
      'greeter-v1',
    );
    expect(screen.getByPlaceholderText(/Destination/)).not.toBeRequired();
    await user.click(screen.getByRole('button', { name: /Next/ }));

    expect(register).toHaveBeenCalledWith({
      body: expect.objectContaining({
        uri: 'https://tunnel.example:9080/env/greeter-v1/http/in-process/9080/',
      }),
    });
  });

  it('asks for a destination when Tunnel is picked', async () => {
    const user = open('?register-deployment=true');

    await user.click(await screen.findByRole('radio', { name: 'Tunnel' }));
    await user.type(
      screen.getByPlaceholderText('Deployment name'),
      'my-tunnel',
    );
    const destination = screen.getByPlaceholderText(/Destination/);
    expect(destination).toBeRequired();
    await user.type(destination, 'http://localhost:9080');
    await user.click(screen.getByRole('button', { name: /Next/ }));

    expect(register).toHaveBeenCalledWith({
      body: expect.objectContaining({
        uri: 'https://tunnel.example:9080/env/my-tunnel/http/http://localhost:9080',
      }),
    });
  });

  it('hands the connected-service setup to the host with the typed name', async () => {
    host.OnboardingGuide = ({ stage, endpoint }) => (
      <div data-testid={stage}>{endpoint}</div>
    );
    const user = open('?register-deployment=connect://greeter-v1');

    expect(
      await screen.findByTestId('view-template-connect'),
    ).toHaveTextContent('greeter-v1');
    expect(screen.getByRole('button', { name: /Expand/ })).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('Deployment name'), '-eu');
    expect(screen.getByTestId('view-template-connect')).toHaveTextContent(
      'greeter-v1-eu',
    );
  });

  it('ignores a connect:// prefill when the host has no tunnels', async () => {
    host.isTunnelEnabled = false;
    open('?register-deployment=connect://greeter-v1');

    expect(
      await screen.findByPlaceholderText('http://localhost:9080'),
    ).toHaveValue('');
    expect(screen.getByPlaceholderText('Deployment name')).toHaveValue('');
    expect(screen.queryByText(/Connect your service/)).toBeNull();
  });

  it('keeps a typed connect:// as the endpoint when the host has no tunnels', async () => {
    host.isTunnelEnabled = false;
    const user = open('?register-deployment=true');

    const endpoint = await screen.findByPlaceholderText(
      'http://localhost:9080',
    );
    await user.type(endpoint, 'connect://greeter');

    expect(endpoint).toHaveValue('connect://greeter');
    expect(screen.getByPlaceholderText('Deployment name')).toHaveValue('');
  });

  it('opens on Connected service with an empty name for a bare connect:// prefill', async () => {
    open('?register-deployment=connect://');

    const name = await screen.findByPlaceholderText('Deployment name');
    expect(name).toHaveValue('');
    expect(name).toHaveFocus();
    expect(
      screen.getByRole('radio', { name: 'Connected service' }),
    ).toBeChecked();
  });
});

describe('TriggerRegisterDeploymentDialog', () => {
  it('prefills the endpoint it is given', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '*',
          element: (
            <TriggerRegisterDeploymentDialog endpoint="connect://">
              Connect your service
            </TriggerRegisterDeploymentDialog>
          ),
        },
      ],
      { initialEntries: ['/overview'] },
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('link', { name: /Connect your service/ }),
    ).toHaveAttribute(
      'href',
      expect.stringMatching(/register-deployment=connect(:|%3A)(\/|%2F){2}$/),
    );
  });
});
