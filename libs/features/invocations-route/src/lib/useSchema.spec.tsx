import { renderHook } from '@testing-library/react';
import { useSchema } from './useSchema';

const useFeatures = vi.hoisted(() => vi.fn());

vi.mock('@restate/data-access/admin-api', () => ({ useFeatures }));

vi.mock('@restate/data-access/admin-api-hooks', () => ({
  useListDeployments: () => ({
    data: { deployments: new Map(), sortedServiceNames: [] },
    isPending: false,
  }),
  useListServices: () => ({ data: new Map(), isPending: false }),
  useListSubscriptions: () => ({
    data: { subscriptions: [] },
    isPending: false,
  }),
}));

describe('useSchema', () => {
  it('offers the VQueue filter when VQueues are enabled', () => {
    useFeatures.mockReturnValue(new Set(['vqueues']));

    const { result } = renderHook(() => useSchema());

    expect(result.current.schema).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'vqueue_id', label: 'VQueue' }),
      ]),
    );
  });

  it('hides the VQueue filter when VQueues are disabled', () => {
    useFeatures.mockReturnValue(new Set());

    const { result } = renderHook(() => useSchema());

    expect(
      result.current.schema.some((field) => field.id === 'vqueue_id'),
    ).toBe(false);
  });
});
