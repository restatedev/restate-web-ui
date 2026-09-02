import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Cell } from './Row';
import { PanelTable } from './PanelTable';
import { PanelTableQuickOpenCaption } from './PanelTableQuickOpen';

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
        toolbar={<button type="button">Go to instance</button>}
        renderCell={(row: { id: string; name: string }) => (
          <Cell>{row.name}</Cell>
        )}
        {...state}
      />,
    );

    expect(screen.getByRole('button', { name: 'Go to instance' })).toBeTruthy();
  });

  it('renders its virtualized body in the page flow by default', () => {
    const items = Array.from({ length: 100 }, (_, index) => ({
      id: `item-${index}`,
      name: `Item ${index}`,
    }));
    const onSelectionChange = vi.fn();

    render(
      <PanelTable
        aria-label="Items"
        columns={[{ id: 'name', name: 'Name', isRowHeader: true }]}
        items={items}
        selectionMode="multiple"
        selectedKeys={new Set(['item-0'])}
        onSelectionChange={onSelectionChange}
        estimatedRowHeight={44}
        renderCell={(row) => <Cell>{row.name}</Cell>}
      />,
    );

    const table = screen.getByRole('grid', { name: 'Items' });
    const headerTable = screen.getByRole('grid', { name: 'Items columns' });
    const bodyContainer = table.parentElement;

    expect(table.tagName).toBe('DIV');
    expect(bodyContainer?.className).toContain('overflow-auto');
    expect(bodyContainer?.className).not.toContain('max-h-');
    expect(bodyContainer?.parentElement?.className).toContain(
      'react-aria-ResizableTableContainer',
    );
    expect(headerTable.querySelectorAll('[role="row"]')).toHaveLength(3);
    const selectAll = headerTable.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    expect(selectAll).not.toBeNull();
    if (!selectAll) throw new Error('Select-all checkbox was not rendered');
    expect(selectAll.indeterminate).toBe(true);
    fireEvent.click(selectAll);
    expect(onSelectionChange).toHaveBeenLastCalledWith(
      new Set(items.map((item) => item.id)),
    );
  });

  it('keeps notices and quick open in caption flow before the data grid', () => {
    render(
      <PanelTable
        aria-label="Items"
        columns={[{ id: 'name', name: 'Name', isRowHeader: true }]}
        items={[{ id: 'one', name: 'One' }]}
        bodyHeadingHeight={0}
        caption={
          <PanelTableQuickOpenCaption
            notice={[
              <div key="partial">Partial results</div>,
              <div key="filtered">Filtered results</div>,
            ]}
          >
            <button type="button">Go to item</button>
          </PanelTableQuickOpenCaption>
        }
        renderCell={(row) => <Cell>{row.name}</Cell>}
      />,
    );

    const partial = screen.getByText('Partial results');
    const filtered = screen.getByText('Filtered results');
    const quickOpen = screen.getByRole('button', { name: 'Go to item' });
    const dataGrid = screen.getByRole('grid', { name: 'Items' });
    const caption = quickOpen.closest('[data-panel-table-quick-open-caption]');
    const spacerHeader = dataGrid.querySelector('[role="rowgroup"]');

    expect(
      partial.compareDocumentPosition(filtered) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      filtered.compareDocumentPosition(quickOpen) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(caption).not.toBeNull();
    if (!caption) throw new Error('Quick-open caption was not rendered');
    expect(
      caption.compareDocumentPosition(dataGrid) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(caption.className).not.toContain('sticky');
    expect(caption.className).not.toContain('absolute');
    expect(caption.className).not.toContain('-mb-');
    expect(caption.className).toContain('mb-1');
    expect(spacerHeader?.className).toContain(
      'h-(--panel-table-body-heading-height)',
    );
    const bodyScroll = caption.closest('[data-panel-table-body-scroll]');
    expect(bodyScroll).not.toBeNull();
    expect(bodyScroll?.getAttribute('style')).toContain(
      '--panel-table-body-heading-height: 0px',
    );
    expect(bodyScroll?.contains(dataGrid)).toBe(true);
    expect(screen.queryByRole('toolbar', { name: 'Items tools' })).toBeNull();
  });
});
