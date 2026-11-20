import { render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import { StateEntriesTable } from './StateObjectTable';

class ResizeObserverMock implements ResizeObserver {
  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
}

const entries = vi.hoisted(() => ({
  current: [] as { name: string; size: number }[],
}));

vi.mock('@restate/data-access-admin-api-hooks', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/data-access-admin-api-hooks')
  >()),
  useListVirtualObjectStateEntries: () => ({
    data: { pages: [{ entries: entries.current }] },
    isPending: false,
    error: null,
    dataUpdatedAt: 1,
    hasNextPage: false,
    isFetching: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  }),
  useGetVirtualObjectState: () => ({
    data: undefined,
    error: null,
    isFetching: false,
  }),
}));

vi.mock('@restate/features-restate-context', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/features-restate-context')
  >()),
  useRestateContext: () => ({ baseUrl: '' }),
}));

function rowOf(stateKey: string) {
  const row = screen.getByText(stateKey).closest('[role="row"]');
  if (!row) {
    throw new Error(`No row for ${stateKey}`);
  }
  return within(row as HTMLElement);
}

describe('StateEntriesTable', () => {
  beforeAll(() => {
    globalThis.ResizeObserver = ResizeObserverMock;
  });

  beforeEach(() => {
    entries.current = [
      { name: 'v22/head', size: 4096 },
      { name: 'greeting', size: 12 },
    ];
  });

  it('offers to edit every key of a Virtual Object', () => {
    render(
      <StateEntriesTable
        serviceName="notes"
        serviceKey="alice"
        onEditValue={vi.fn()}
      />,
    );

    expect(rowOf('v22/head').getByText('Edit')).toBeTruthy();
    expect(rowOf('greeting').getByText('Edit')).toBeTruthy();
  });

  it('does not offer to edit the keys under the read-only prefix', () => {
    render(
      <StateEntriesTable
        serviceName="notes"
        serviceKey="alice"
        readOnlyKeyPrefix="v22/"
        onEditValue={vi.fn()}
      />,
    );

    expect(rowOf('v22/head').queryByText('Edit')).toBeNull();
    expect(rowOf('greeting').getByText('Edit')).toBeTruthy();
  });
});
