import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import {
  ServiceTarget,
  ServiceTargetProvider,
} from '@restate/features/service-target';
import { TenantServiceTarget } from './TenantServiceTarget';

describe('TenantServiceTarget', () => {
  it('overrides nested targets while leaving the default renderer outside the provider', () => {
    const target = (
      <ServiceTarget
        scope="acme"
        service="Greeter"
        handler="run"
        serviceType="Service"
      />
    );
    render(
      <MemoryRouter>
        <ServiceTargetProvider component={TenantServiceTarget}>
          <div data-testid="tenant">{target}</div>
        </ServiceTargetProvider>
        <div data-testid="default">{target}</div>
      </MemoryRouter>,
    );

    const tenant = within(screen.getByTestId('tenant'));
    expect(tenant.getByText('Greeter')).toBeTruthy();
    expect(tenant.queryByText('SCOPE')).toBeNull();
    expect(tenant.queryByText('acme')).toBeNull();
    expect(tenant.queryAllByRole('link')).toHaveLength(0);

    const standard = within(screen.getByTestId('default'));
    expect(standard.getByText('acme')).toBeTruthy();
    expect(
      standard.getAllByRole('link', { name: 'Open Greeter / run handler' })
        .length,
    ).toBeGreaterThan(0);
  });
});
