import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { SchemaRegistryProvider } from '@restate/data-access-admin-api';
import { DeploymentScopeBadge } from './DeploymentScopeBadge';

function Registry({ children }: PropsWithChildren) {
  const client = new QueryClient({
    defaultOptions: { queries: { enabled: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <SchemaRegistryProvider baseUrl="http://registry.test" scope="acme">
        {children}
      </SchemaRegistryProvider>
    </QueryClientProvider>
  );
}

describe('DeploymentScopeBadge', () => {
  it('marks the scope’s own deployments as tenant', () => {
    render(<DeploymentScopeBadge metadata={{ tenant: 'acme' }} />, {
      wrapper: Registry,
    });
    expect(screen.getByText('Tenant')).toBeTruthy();
  });

  it('marks deployments without the scope’s tenant metadata as shared', () => {
    render(<DeploymentScopeBadge metadata={{ team: 'platform' }} />, {
      wrapper: Registry,
    });
    expect(screen.getByText('Shared')).toBeTruthy();
  });

  it('renders nothing outside a schema registry', () => {
    const { container } = render(
      <DeploymentScopeBadge metadata={{ tenant: 'acme' }} />,
    );
    expect(container.innerHTML).toBe('');
  });
});
