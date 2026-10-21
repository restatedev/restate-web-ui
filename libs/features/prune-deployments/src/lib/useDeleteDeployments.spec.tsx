import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeleteDeployments } from './useDeleteDeployments';

const {
  bulkDeleteMock,
  deleteDeploymentMock,
  invalidateListServicesMock,
  isVersionGteMock,
} = vi.hoisted(() => ({
  bulkDeleteMock: vi.fn(),
  deleteDeploymentMock: vi.fn(),
  invalidateListServicesMock: vi.fn(),
  isVersionGteMock: vi.fn<(version: string) => boolean>(),
}));

vi.mock('@restate/data-access-admin-api', () => ({
  useAdminBaseUrl: () => 'http://localhost:9070',
  adminApi: () => ({
    mutationKey: ['/deployments/{deployment}'],
    mutationFn: deleteDeploymentMock,
    meta: {},
  }),
}));

vi.mock('@restate/data-access-admin-api-hooks', () => ({
  invalidateListServices: invalidateListServicesMock,
  useBulkDeleteDeployments: () => ({ mutateAsync: bulkDeleteMock }),
}));

vi.mock('@restate/features-restate-context', () => ({
  useRestateContext: () => ({ isVersionGte: isVersionGteMock }),
}));

function renderDeleteDeployments() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(() => useDeleteDeployments(), { wrapper });
}

describe('useDeleteDeployments', () => {
  beforeEach(() => {
    bulkDeleteMock.mockReset();
    deleteDeploymentMock.mockReset();
    invalidateListServicesMock.mockReset();
    isVersionGteMock.mockReset();
  });

  it('deletes deployments with one bulk request on 1.8.1 and later', async () => {
    isVersionGteMock.mockImplementation((version) => version === '1.8.1');
    bulkDeleteMock.mockResolvedValue({
      succeeded: ['dp_1', 'dp_2'],
      failed: [
        { deployment_id: 'dp_3', reason: 'not_found', error: 'not found' },
      ],
    });
    const { result } = renderDeleteDeployments();

    let output: { failedCount: number } | undefined;
    await act(async () => {
      output = await result.current.mutateAsync(['dp_1', 'dp_2', 'dp_3']);
    });

    expect(bulkDeleteMock).toHaveBeenCalledTimes(1);
    expect(bulkDeleteMock).toHaveBeenCalledWith({
      body: { deployment_ids: ['dp_1', 'dp_2', 'dp_3'], force: true },
    });
    expect(deleteDeploymentMock).not.toHaveBeenCalled();
    expect(output).toEqual({ failedCount: 1 });
    expect(result.current.progress).toMatchObject({
      successfulDeploymentIds: ['dp_1', 'dp_2'],
      pendingDeploymentIds: [],
      failedCount: 1,
      failedDeployments: [{ deploymentId: 'dp_3', error: 'not found' }],
    });
  });

  it('sends at most 1000 deployments per request and fails a rejected batch', async () => {
    isVersionGteMock.mockReturnValue(true);
    const deploymentIds = Array.from({ length: 1001 }, (_, i) => `dp_${i}`);
    bulkDeleteMock
      .mockResolvedValueOnce({
        succeeded: deploymentIds.slice(0, 1000),
        failed: [],
      })
      .mockRejectedValueOnce(new Error('schema update failed'));
    const { result } = renderDeleteDeployments();

    let output: { failedCount: number } | undefined;
    await act(async () => {
      output = await result.current.mutateAsync(deploymentIds);
    });

    expect(bulkDeleteMock).toHaveBeenCalledTimes(2);
    expect(
      bulkDeleteMock.mock.calls.map(
        ([variables]) => variables.body.deployment_ids.length,
      ),
    ).toEqual([1000, 1]);
    expect(output).toEqual({ failedCount: 1 });
    expect(result.current.progress).toMatchObject({
      pendingDeploymentIds: [],
      failedCount: 1,
      failedDeployments: [
        { deploymentId: 'dp_1000', error: 'schema update failed' },
      ],
    });
    expect(result.current.progress?.successfulDeploymentIds).toHaveLength(1000);
  });

  it('deletes deployments one by one on older servers', async () => {
    isVersionGteMock.mockReturnValue(false);
    deleteDeploymentMock.mockImplementation(
      async ({
        parameters,
      }: {
        parameters: { path: { deployment: string } };
      }) => {
        if (parameters.path.deployment === 'dp_2') {
          throw new Error('in use');
        }
      },
    );
    const { result } = renderDeleteDeployments();

    let output: { failedCount: number } | undefined;
    await act(async () => {
      output = await result.current.mutateAsync(['dp_1', 'dp_2']);
    });

    expect(bulkDeleteMock).not.toHaveBeenCalled();
    expect(deleteDeploymentMock).toHaveBeenCalledTimes(2);
    expect(deleteDeploymentMock.mock.calls[0]?.[0]).toEqual({
      parameters: { path: { deployment: 'dp_1' }, query: { force: true } },
    });
    expect(output).toEqual({ failedCount: 1 });
    expect(invalidateListServicesMock).toHaveBeenCalledTimes(1);
    expect(result.current.progress).toMatchObject({
      successfulDeploymentIds: ['dp_1'],
      pendingDeploymentIds: [],
      failedCount: 1,
      failedDeployments: [{ deploymentId: 'dp_2', error: 'in use' }],
    });
  });
});
