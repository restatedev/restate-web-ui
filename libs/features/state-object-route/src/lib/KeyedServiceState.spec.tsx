import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { KeyedServiceState } from './KeyedServiceState';

const table = vi.hoisted(() => ({ props: vi.fn() }));

vi.mock('./StateObjectTable', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./StateObjectTable')>()),
  StateEntriesTable: (props: { readOnlyKeyPrefix?: string }) => {
    table.props(props);
    return <div data-testid="state-entries" />;
  },
}));

const identity = { service: 'notes', key: 'alice' };

describe('KeyedServiceState', () => {
  beforeEach(() => {
    table.props.mockClear();
  });

  it('offers to edit the state of a Virtual Object key', () => {
    render(
      <KeyedServiceState identity={identity} serviceType="virtual_object" />,
    );

    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.queryByText(/SQL database/)).toBeNull();
    expect(table.props).toHaveBeenLastCalledWith(
      expect.objectContaining({ readOnlyKeyPrefix: undefined }),
    );
  });

  it('explains instead of offering to edit the SDK-written state of a Session Object key', () => {
    render(
      <KeyedServiceState
        identity={identity}
        serviceType="virtual_object"
        readOnlyStateKeyPrefix="v22/"
      />,
    );

    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByText('Edit state…')).toBeNull();
    expect(screen.queryByText('Delete state…')).toBeNull();
    expect(
      screen.getByText(
        'These are pages of this key’s SQL database, written by the SDK. Editing them would corrupt it.',
      ),
    ).toBeTruthy();
    expect(table.props).toHaveBeenLastCalledWith(
      expect.objectContaining({ readOnlyKeyPrefix: 'v22/' }),
    );
  });
});
