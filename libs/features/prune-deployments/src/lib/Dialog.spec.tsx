import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { PruneDrainedDeploymentsDialog } from './Dialog';

const { useListDeploymentsMock, useListDrainedDeploymentsMock } = vi.hoisted(
  () => ({
    useListDeploymentsMock: vi.fn(),
    useListDrainedDeploymentsMock: vi.fn(),
  }),
);

vi.mock('@restate/data-access/admin-api-hooks', () => ({
  useListDeployments: useListDeploymentsMock,
  useListDrainedDeployments: useListDrainedDeploymentsMock,
}));

vi.mock('@restate/ui/dialog', () => ({
  DialogClose: ({ children }: { children: ReactNode }) => children,
  DialogContent: ({ children }: { children: ReactNode }) => children,
  DialogFooter: ({ children }: { children: ReactNode }) => children,
  QueryDialog: ({ children }: { children: ReactNode }) => children,
}));

describe('PruneDrainedDeploymentsDialog', () => {
  it('does not load deployments while closed', () => {
    render(
      <MemoryRouter initialEntries={['/?view=deployments']}>
        <PruneDrainedDeploymentsDialog />
      </MemoryRouter>,
    );

    expect(useListDrainedDeploymentsMock).not.toHaveBeenCalled();
    expect(useListDeploymentsMock).not.toHaveBeenCalled();
  });
});
