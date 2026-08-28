import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Cell } from './Row';
import { PanelTable } from './PanelTable';

class ResizeObserverMock implements ResizeObserver {
  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
}

describe('PanelTable', () => {
  beforeAll(() => {
    globalThis.ResizeObserver = ResizeObserverMock;
  });

  it('renders a sticky toolbar below the column header and before the caption', () => {
    render(
      <PanelTable
        aria-label="Items"
        columns={[{ id: 'name', name: 'Name', isRowHeader: true }]}
        items={[{ id: 'one', name: 'One' }]}
        toolbar={<button type="button">Filter items</button>}
        toolbarWrapperClassName="custom-toolbar-wrapper"
        toolbarClassName="custom-toolbar"
        caption={<div>Table notice</div>}
        renderCell={(row) => <Cell>{row.name}</Cell>}
      />,
    );

    const toolbar = screen.getByRole('toolbar', { name: 'Items tools' });
    const caption = screen.getByText('Table notice');

    expect(toolbar.parentElement?.className).toContain('sticky');
    expect(toolbar.parentElement?.className).toContain(
      'custom-toolbar-wrapper',
    );
    expect(toolbar.className).toContain('custom-toolbar');
    expect(
      toolbar.compareDocumentPosition(caption) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it.each([
    ['loading', { isLoading: true }],
    ['empty', {}],
    ['error', { error: new Error('Unavailable') }],
  ])('keeps its toolbar visible when the body is %s', (_, state) => {
    render(
      <PanelTable
        aria-label="Items"
        columns={[{ id: 'name', name: 'Name', isRowHeader: true }]}
        items={[]}
        toolbar={<button type="button">Open instance</button>}
        renderCell={(row: { id: string; name: string }) => (
          <Cell>{row.name}</Cell>
        )}
        {...state}
      />,
    );

    expect(screen.getByRole('button', { name: 'Open instance' })).toBeTruthy();
  });
});
