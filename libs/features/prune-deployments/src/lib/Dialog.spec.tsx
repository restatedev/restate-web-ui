import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DeleteSelectedDeploymentsDialog,
  PruneDrainedDeploymentsDialog,
} from './Dialog';

const {
  invalidateQueriesMock,
  useDeleteDeploymentsMock,
  useListDeploymentsMock,
  useListDrainedDeploymentsMock,
} = vi.hoisted(() => ({
  invalidateQueriesMock: vi.fn(),
  useDeleteDeploymentsMock: vi.fn(),
  useListDeploymentsMock: vi.fn(),
  useListDrainedDeploymentsMock: vi.fn(),
}));

vi.mock('@restate/data-access/admin-api-hooks', () => ({
  useListDeployments: useListDeploymentsMock,
  useListDrainedDeployments: useListDrainedDeploymentsMock,
}));

vi.mock('@restate/features/deployment', () => ({
  Deployment: ({ deploymentId }: { deploymentId: string }) => (
    <div>{deploymentId}</div>
  ),
  Warning: ({ title, children }: { title?: string; children: ReactNode }) => (
    <div role="alert">
      {title} {children}
    </div>
  ),
}));

vi.mock('@tanstack/react-query', () => ({
  useIsMutating: () => 0,
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}));

vi.mock('./useDeleteDeployments', () => ({
  useDeleteDeployments: useDeleteDeploymentsMock,
}));

vi.mock('@restate/ui/dialog', () => ({
  DialogClose: ({ children }: { children: ReactNode }) => children,
  DialogContent: ({ children }: { children: ReactNode }) => children,
  DialogFooter: ({ children }: { children: ReactNode }) => children,
  QueryDialog: ({ children }: { children: ReactNode }) => children,
}));

describe('PruneDrainedDeploymentsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDeleteDeploymentsMock.mockReturnValue({
      progress: null,
      isPending: false,
      mutateAsync: vi.fn(),
    });
  });

  it('does not load deployments while closed', () => {
    render(
      <MemoryRouter initialEntries={['/?view=deployments']}>
        <PruneDrainedDeploymentsDialog />
      </MemoryRouter>,
    );

    expect(useListDrainedDeploymentsMock).not.toHaveBeenCalled();
    expect(useListDeploymentsMock).not.toHaveBeenCalled();
  });

  it('warns when selected deployments include an active deployment', () => {
    useListDrainedDeploymentsMock.mockReturnValue({
      data: new Set(['dp_drained']),
      isPending: false,
      error: null,
      queryKey: ['drained-deployments'],
    });
    useListDeploymentsMock.mockReturnValue({
      isPending: false,
      error: null,
      queryKey: ['deployments'],
    });

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <DeleteSelectedDeploymentsDialog
              deploymentIds={['dp_active', 'dp_drained']}
              onDeleted={vi.fn()}
            />
          ),
        },
      ],
      { initialEntries: ['/?deleteSelectedDeployments=true'] },
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByRole('alert').textContent).toContain(
      '1 selected deployment is active',
    );
  });
});
