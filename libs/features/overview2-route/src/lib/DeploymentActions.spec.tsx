import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { PRUNE_DRAINED_DEPLOYMENTS_QUERY } from '@restate/features/prune-deployments';
import { DeploymentActions } from './DeploymentActions';

vi.mock('@restate/features/register-deployment', () => ({
  REGISTER_DEPLOYMENT_QUERY: 'registerDeployment',
  TriggerRegisterDeploymentDialog: ({ children }: { children: ReactNode }) =>
    children,
}));

vi.mock('@restate/ui/dropdown', () => ({
  DropdownItem: ({
    children,
    value,
    href,
    isDisabled,
  }: {
    children: ReactNode;
    value?: string;
    href?: string;
    isDisabled?: boolean;
  }) => (
    <div
      data-testid={value ?? href}
      data-disabled={String(Boolean(isDisabled))}
    >
      {children}
    </div>
  ),
}));

vi.mock('@restate/ui/icons', () => ({
  Icon: () => null,
  IconName: { Plus: 'plus', Trash: 'trash' },
}));

vi.mock('@restate/ui/split-button', () => ({
  SplitButton: ({
    children,
    menus,
    onSelect,
  }: {
    children: ReactNode;
    menus: ReactNode;
    onSelect?: (key: string) => void;
  }) => (
    <div>
      {children}
      {menus}
      <button onClick={() => onSelect?.('pruneDrainedDeployments')}>
        Choose prune
      </button>
    </div>
  ),
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}

describe('DeploymentActions', () => {
  it('offers pruning on every tab and opens it through Deployments', () => {
    render(
      <MemoryRouter initialEntries={['/?view=services&filter=checkout']}>
        <DeploymentActions />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(
      screen
        .getByTestId(PRUNE_DRAINED_DEPLOYMENTS_QUERY)
        .getAttribute('data-disabled'),
    ).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Choose prune' }));

    const searchParams = new URLSearchParams(
      screen.getByTestId('location').textContent ?? '',
    );
    expect(searchParams.get('view')).toBe('deployments');
    expect(searchParams.get(PRUNE_DRAINED_DEPLOYMENTS_QUERY)).toBe('true');
    expect(searchParams.get('filter')).toBe('checkout');
  });
});
