import { renderHook } from '@testing-library/react';
import { useSchema } from './useSchema';

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
  it('offers the VQueue filter', () => {
    const { result } = renderHook(() => useSchema());

    expect(result.current.schema).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'vqueue_id', label: 'VQueue' }),
      ]),
    );
  });
});
