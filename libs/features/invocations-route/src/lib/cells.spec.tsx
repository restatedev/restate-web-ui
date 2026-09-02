import { Invocation } from '@restate/data-access/admin-api-spec';
import { useGetJournalEntryMetadata } from '@restate/data-access/admin-api-hooks';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Column,
  Row,
  Table,
  TableBody,
  TableHeader,
} from 'react-aria-components';
import { MemoryRouter } from 'react-router';
import { InvocationCell } from './cells';
import { ColumnKey } from './columns';

vi.mock('@restate/data-access/admin-api-hooks', async (importOriginal) => ({
  ...(await importOriginal()),
  useGetJournalEntryMetadata: vi.fn(),
}));

const getJournalEntryMetadata = vi.mocked(useGetJournalEntryMetadata);

const invocation = {
  id: 'inv_123',
  created_at: '2026-09-02T11:59:00.000Z',
  modified_at: '2026-09-02T12:00:00.000Z',
  status: 'running',
  journal_size: 2,
  journal_commands_size: 2,
} as Invocation;

function CellHarness({ column }: { column: ColumnKey }) {
  return (
    <MemoryRouter>
      <SnapshotTimeProvider lastSnapshot={Date.parse(invocation.modified_at)}>
        <Table aria-label="Invocations">
          <TableHeader>
            <Column isRowHeader>{column}</Column>
          </TableHeader>
          <TableBody>
            <Row>
              <InvocationCell
                invocation={invocation}
                column={column}
                isVisible
              />
            </Row>
          </TableBody>
        </Table>
      </SnapshotTimeProvider>
    </MemoryRouter>
  );
}

function renderCell(column: ColumnKey) {
  return render(<CellHarness column={column} />);
}

describe('invocation last journal entry', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'CSS', {
      configurable: true,
      value: { escape: (value: string) => value },
    });
  });

  beforeEach(() => {
    getJournalEntryMetadata.mockReset();
  });

  it('does not request entry metadata from the journal cell', () => {
    renderCell('journal_size');

    expect(screen.getByRole('button', { name: /2 entries/ })).toBeTruthy();
    expect(getJournalEntryMetadata).not.toHaveBeenCalled();
  });

  it('requests entry metadata only after opening Modified at', async () => {
    getJournalEntryMetadata.mockReturnValue({
      data: {
        category: 'command',
        type: 'Call',
      },
      error: null,
      isPending: false,
    } as ReturnType<typeof useGetJournalEntryMetadata>);
    const user = userEvent.setup();
    renderCell('modified_at');

    expect(getJournalEntryMetadata).not.toHaveBeenCalled();
    const trigger = screen.getByRole('button', {
      name: /Show last journal entry/,
    });
    expect(trigger.className).toContain('bg-transparent');
    expect(trigger.className).toContain('hover:bg-black/5');
    expect(trigger.className).toContain('pressed:bg-black/10');
    expect(
      screen.getByRole('button', { name: /Show last journal entry/ })
        .textContent,
    ).toContain('journal updated');
    expect(screen.getByText(', journal updated').className).toContain(
      'text-zinc-500/80',
    );

    await user.click(
      screen.getByRole('button', { name: /Show last journal entry/ }),
    );

    await waitFor(() =>
      expect(getJournalEntryMetadata).toHaveBeenLastCalledWith('inv_123', 1),
    );
    expect(screen.getByText('Last journal entry')).toBeTruthy();
    expect(screen.getByRole('dialog').textContent).toContain('call()');
  });

  it('shows loading, empty, and failed request states in the popover', async () => {
    getJournalEntryMetadata.mockReturnValue({
      data: undefined,
      error: null,
      isPending: true,
    } as ReturnType<typeof useGetJournalEntryMetadata>);
    const user = userEvent.setup();
    const { rerender } = renderCell('modified_at');

    await user.click(
      screen.getByRole('button', { name: /Show last journal entry/ }),
    );
    expect(screen.getByText('Loading last journal entry…')).toBeTruthy();

    getJournalEntryMetadata.mockReturnValue({
      data: undefined,
      error: null,
      isPending: false,
    } as ReturnType<typeof useGetJournalEntryMetadata>);
    rerender(<CellHarness column="modified_at" />);
    expect(
      screen.getByText('No last journal entry details are available.'),
    ).toBeTruthy();

    getJournalEntryMetadata.mockReturnValue({
      data: undefined,
      error: new Error('Unable to load entry metadata'),
      isPending: false,
    } as ReturnType<typeof useGetJournalEntryMetadata>);
    rerender(<CellHarness column="modified_at" />);
    expect(screen.getByText('Unable to load entry metadata')).toBeTruthy();
  });
});
