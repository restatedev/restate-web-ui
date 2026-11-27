import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { useContext } from 'react';
import {
  Button,
  Collection,
  CollectionRendererContext,
  DefaultCollectionRenderer,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from 'react-aria-components';
import { vi } from 'vitest';
import { Cell, Row } from './Row';
import {
  PanelTable,
  type PanelTableColumn,
  type PanelTableProps,
} from './PanelTable';
import { PanelTableQuickOpenCaption } from './PanelTableQuickOpen';

class ResizeObserverMock implements ResizeObserver {
  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
}

function stubResizeObservers() {
  const observers: {
    callback: ResizeObserverCallback;
    targets: Element[];
  }[] = [];
  vi.stubGlobal(
    'ResizeObserver',
    class extends ResizeObserverMock {
      targets: Element[] = [];
      override observe = vi.fn((target: Element) => {
        this.targets.push(target);
      });
      constructor(callback: ResizeObserverCallback) {
        super();
        observers.push({ callback, targets: this.targets });
      }
    },
  );
  return (target: Element) => {
    const observer = observers.find(({ targets }) => targets.includes(target));
    if (!observer) throw new Error('Element was not observed');
    return {
      targets: observer.targets,
      notify: () => observer.callback([], new ResizeObserver(() => undefined)),
    };
  };
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
    const items = Array.from({ length: 20 }, (_, index) => ({
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
    expect(bodyContainer?.className).toContain('overflow-x-auto');
    expect(bodyContainer?.className).toContain('overflow-y-hidden');
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

  it('leaves disabled rows out of select-all and row actions', () => {
    const items = [
      { id: 'one', name: 'One' },
      { id: 'two', name: 'Two' },
      { id: 'three', name: 'Three' },
    ];
    const onSelectionChange = vi.fn();
    const onRowAction = vi.fn();

    render(
      <PanelTable
        aria-label="Items"
        columns={[{ id: 'name', name: 'Name', isRowHeader: true }]}
        items={items}
        selectionMode="multiple"
        selectedKeys={new Set()}
        disabledKeys={['two']}
        onSelectionChange={onSelectionChange}
        onRowAction={onRowAction}
        renderCell={(row) => <Cell>{row.name}</Cell>}
      />,
    );

    expect(
      screen.getByRole('row', { name: /Two/ }).getAttribute('aria-disabled'),
    ).toBe('true');
    fireEvent.click(screen.getByText('Two'));
    expect(onRowAction).not.toHaveBeenCalled();

    const selectAll = screen
      .getByRole('grid', { name: 'Items columns' })
      .querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!selectAll) throw new Error('Select-all checkbox was not rendered');
    fireEvent.click(selectAll);
    expect(onSelectionChange).toHaveBeenLastCalledWith(
      new Set(['one', 'three']),
    );
  });

  it('renders an empty body without virtualization', () => {
    const renderTable = (items: { id: string; name: string }[]) => (
      <PanelTable
        aria-label="Items"
        columns={[{ id: 'name', name: 'Name', isRowHeader: true }]}
        items={items}
        caption={<div>Table notice</div>}
        emptyPlaceholder={<div>No items</div>}
        renderCell={(row) => <Cell>{row.name}</Cell>}
      />
    );
    const { rerender } = render(renderTable([{ id: 'one', name: 'One' }]));

    expect(screen.getByRole('grid', { name: 'Items' }).tagName).toBe('DIV');

    rerender(renderTable([]));

    expect(screen.getByRole('grid', { name: 'Items' }).tagName).toBe('TABLE');
    expect(screen.getByText('No items')).toBeTruthy();
    expect(screen.getByText('Table notice')).toBeTruthy();
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

  describe('row ids that match column ids', () => {
    const columns = [
      { id: 'name', name: 'Name', isRowHeader: true },
      { id: 'health', name: 'Health' },
      { id: 'invocations', name: 'Invocations' },
      { id: 'created_at', name: 'Created at' },
      { id: 'deployment', name: 'Deployment' },
    ];

    it.each(
      [
        'name',
        'health',
        'invocations',
        'created_at',
        'deployment',
        '__panel_table_spacer_left__',
        '__panel_table_spacer_right__',
      ].flatMap((id) => [
        [id, true],
        [id, false],
      ]),
    )('renders a row with id %s (virtualized: %s)', (id, virtualized) => {
      expect(() =>
        render(
          <PanelTable
            aria-label="Services"
            columns={columns}
            items={[
              { id: 'other', name: 'Other' },
              { id, name: id },
            ]}
            virtualized={virtualized}
            renderCell={(row, col) => (
              <Cell>{col.id === 'name' ? row.name : null}</Cell>
            )}
          />,
        ),
      ).not.toThrow();
    });

    it.each(
      Array.from({ length: 25 }, (_, index) => `react-aria-${index}`).flatMap(
        (id) => [
          [id, true],
          [id, false],
        ],
      ),
    )(
      'renders a row with auto-generated key %s (virtualized: %s)',
      (id, virtualized) => {
        const items = [
          ...Array.from({ length: 8 }, (_, index) => ({
            id: `item-${index}`,
            name: `Item ${index}`,
          })),
          { id, name: id },
        ];

        expect(() =>
          render(
            <PanelTable
              aria-label="Services"
              columns={columns}
              items={items}
              selectionMode="multiple"
              treeColumn="name"
              expandedKeys={new Set(items.map((item) => item.id))}
              virtualized={virtualized}
              renderCell={(row, col) => (
                <Cell>{col.id === 'name' ? row.name : null}</Cell>
              )}
              renderChildRows={(row, tableColumns) => (
                <Collection items={[{ id: `${row.id}\u0000child` }]}>
                  {(child) => (
                    <Row id={child.id} columns={tableColumns} hasLeadingCell>
                      {(col) => <Cell key={col.id} />}
                    </Row>
                  )}
                </Collection>
              )}
            />,
          ),
        ).not.toThrow();
      },
    );
  });

  it('reports sort changes with the original column id', () => {
    const onSortChange = vi.fn();

    render(
      <PanelTable
        aria-label="Items"
        columns={[
          { id: 'name', name: 'Name', isRowHeader: true, allowsSorting: true },
          { id: 'created_at', name: 'Created at', allowsSorting: true },
        ]}
        items={[{ id: 'one', name: 'One' }]}
        sortDescriptor={{ column: 'name', direction: 'ascending' }}
        onSortChange={onSortChange}
        renderCell={(row) => <Cell>{row.name}</Cell>}
      />,
    );

    const headerTable = screen.getByRole('grid', { name: 'Items columns' });
    const [nameHeader, createdAtHeader] = Array.from(
      headerTable.querySelectorAll<HTMLElement>('[role="columnheader"]'),
    ).filter((header) => header.textContent?.trim());

    expect(nameHeader?.getAttribute('aria-sort')).toBe('ascending');
    if (!createdAtHeader) throw new Error('Created at header was not rendered');
    fireEvent.click(createdAtHeader);
    expect(onSortChange).toHaveBeenLastCalledWith({
      column: 'created_at',
      direction: 'ascending',
    });
  });

  describe('saved column widths', () => {
    const STORAGE_KEY = 'items-col-widths';

    const itemsTable = (columns: PanelTableColumn[]) => (
      <PanelTable
        aria-label="Items"
        columns={columns}
        items={[{ id: 'one', name: 'One' }]}
        columnWidthsStorageKey={STORAGE_KEY}
        renderCell={(row) => <Cell>{row.name}</Cell>}
      />
    );

    const headerTable = () =>
      screen.getByRole('grid', { name: 'Items columns' });
    const columnHeader = (name: RegExp) =>
      within(headerTable()).getByRole('columnheader', { name });
    const resizers = () =>
      headerTable().querySelectorAll<HTMLInputElement>('input[type="range"]');

    beforeEach(() => {
      localStorage.clear();
    });

    it.each([undefined, STORAGE_KEY])(
      'renders columns named like object properties (storage key: %s)',
      (columnWidthsStorageKey) => {
        render(
          <PanelTable
            aria-label="Items"
            columns={[
              { id: 'constructor', name: 'constructor' },
              { id: 'toString', name: 'toString' },
              { id: '__proto__', name: '__proto__' },
              { id: 'ordinary', name: 'ordinary' },
            ]}
            items={[{ id: 'one', name: 'One' }]}
            columnWidthsStorageKey={columnWidthsStorageKey}
            renderCell={(row) => <Cell>{row.name}</Cell>}
          />,
        );

        expect(columnHeader(/constructor/).style.width).not.toBe('');
        expect(resizers()).toHaveLength(3);
      },
    );

    it('saves only the column that was resized', () => {
      render(
        itemsTable([
          { id: 'name', name: 'Name', isRowHeader: true, defaultWidth: 200 },
          { id: 'created_at', name: 'Created at', defaultWidth: 150 },
          { id: 'target', name: 'Target' },
          { id: 'actions', name: 'Actions', width: 40, hideLabel: true },
        ]),
      );

      const createdAtResizer = resizers()[1];
      if (!createdAtResizer)
        throw new Error('Created at resizer was not rendered');

      fireEvent.keyDown(createdAtResizer, { key: 'Enter' });
      fireEvent.keyDown(createdAtResizer, { key: 'ArrowRight' });
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      fireEvent.keyDown(createdAtResizer, { key: 'Enter' });

      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
        created_at: 160,
      });
    });

    it('starts from the saved width when the table mounts again', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ created_at: 300 }));

      render(
        itemsTable([
          { id: 'name', name: 'Name', isRowHeader: true, defaultWidth: 200 },
          { id: 'created_at', name: 'Created at', defaultWidth: 150 },
          { id: 'target', name: 'Target' },
        ]),
      );

      expect(columnHeader(/Created at/).style.width).toBe('300px');
    });

    it('keeps the last flexible column flexible', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ created_at: 300, target: 500 }),
      );
      const columns: PanelTableColumn[] = [
        { id: 'name', name: 'Name', isRowHeader: true, defaultWidth: 200 },
        { id: 'created_at', name: 'Created at' },
        { id: 'target', name: 'Target' },
        { id: 'actions', name: 'Actions', width: 40, hideLabel: true },
      ];

      const { rerender } = render(itemsTable(columns));

      expect(columnHeader(/Created at/).style.width).toBe('300px');
      expect(columnHeader(/Target/).style.width).not.toBe('500px');

      rerender(itemsTable(columns.filter(({ id }) => id !== 'target')));

      expect(columnHeader(/Created at/).style.width).not.toBe('300px');
      expect(resizers()).toHaveLength(1);
    });
  });

  it.each([true, false])(
    'renders child rows of an expanded tree row (virtualized: %s)',
    (virtualized) => {
      render(
        <PanelTable
          aria-label="Items"
          columns={[{ id: 'name', name: 'Name', isRowHeader: true }]}
          items={[{ id: 'parent', name: 'Parent' }]}
          treeColumn="name"
          expandedKeys={new Set(['parent'])}
          virtualized={virtualized}
          renderCell={(row) => <Cell>{row.name}</Cell>}
          renderChildRows={(row, columns) => (
            <Collection
              items={[{ id: `${row.id}-child`, name: `${row.name} child` }]}
            >
              {(child) => (
                <Row id={child.id} columns={columns} hasLeadingCell>
                  {(col) => (
                    <Cell key={col.id}>
                      {col.id === 'name' ? child.name : null}
                    </Cell>
                  )}
                </Row>
              )}
            </Collection>
          )}
        />,
      );

      expect(screen.getByText('Parent child')).toBeTruthy();
    },
  );

  it('observes header columns added after the first render', () => {
    const observerOf = stubResizeObservers();
    const columns = [{ id: 'name', name: 'Name', isRowHeader: true }];
    const props = {
      'aria-label': 'Items',
      items: [{ id: 'one', name: 'One' }],
      renderCell: (row: { id: string; name: string }) => (
        <Cell>{row.name}</Cell>
      ),
    };

    const { rerender } = render(<PanelTable {...props} columns={columns} />);
    rerender(
      <PanelTable
        {...props}
        columns={[...columns, { id: 'status', name: 'Status' }]}
      />,
    );

    const headerTable = screen.getByRole('grid', { name: 'Items columns' });
    const header = observerOf(headerTable);
    const statusHeader = Array.from(headerTable.querySelectorAll('th')).find(
      (th) => th.textContent === 'Status',
    );
    if (!statusHeader) throw new Error('Status header was not rendered');
    expect(header.targets).not.toContain(statusHeader);

    act(() => header.notify());

    expect(header.targets).toContain(statusHeader);
    vi.unstubAllGlobals();
  });

  it('scrolls the header and the body together from either side', () => {
    render(
      <PanelTable
        aria-label="Items"
        columns={[
          { id: 'name', name: 'Name', isRowHeader: true },
          { id: 'status', name: 'Status' },
        ]}
        items={[{ id: 'one', name: 'One' }]}
        renderCell={(row) => <Cell>{row.name}</Cell>}
      />,
    );
    const header = screen
      .getByRole('grid', { name: 'Items columns' })
      .closest<HTMLElement>('.overflow-x-auto');
    const body = screen
      .getByRole('grid', { name: 'Items' })
      .closest<HTMLElement>('[data-panel-table-body-scroll]');
    if (!header || !body) throw new Error('Scroll containers were not found');

    header.scrollLeft = 120;
    fireEvent.scroll(header);
    expect(body.scrollLeft).toBe(120);

    header.scrollLeft = 150;
    fireEvent.scroll(body);
    expect(header.scrollLeft).toBe(150);
    fireEvent.scroll(header);
    expect(body.scrollLeft).toBe(150);

    body.scrollLeft = 40;
    fireEvent.scroll(body);
    expect(header.scrollLeft).toBe(40);
  });

  it('keeps the header scroll position when the body is replaced', () => {
    const props = {
      'aria-label': 'Items',
      columns: [
        { id: 'name', name: 'Name', isRowHeader: true },
        { id: 'status', name: 'Status' },
      ],
      renderCell: (row: { id: string; name: string }) => (
        <Cell>{row.name}</Cell>
      ),
    };
    const { rerender } = render(
      <PanelTable {...props} items={[{ id: 'one', name: 'One' }]} />,
    );
    const header = screen
      .getByRole('grid', { name: 'Items columns' })
      .closest<HTMLElement>('.overflow-x-auto');
    if (!header) throw new Error('Header scroll container was not found');

    header.scrollLeft = 120;
    fireEvent.scroll(header);
    rerender(<PanelTable {...props} items={[]} />);
    rerender(<PanelTable {...props} items={[{ id: 'two', name: 'Two' }]} />);

    const body = screen
      .getByRole('grid', { name: 'Items' })
      .closest<HTMLElement>('[data-panel-table-body-scroll]');
    expect(header.scrollLeft).toBe(120);
    expect(body?.scrollLeft).toBe(120);
  });

  it.each([
    [
      'the last column is flexible',
      [
        { id: 'name', name: 'Name', isRowHeader: true },
        { id: 'status', name: 'Status' },
        { id: 'created_at', name: 'Created at' },
      ],
      ['Name', 'Status'],
    ],
    [
      'fixed columns follow',
      [
        { id: 'name', name: 'Name', isRowHeader: true },
        { id: 'size', name: 'Size', width: 96 },
        { id: 'status', name: 'Status' },
        { id: 'actions', name: 'Actions', width: 40 },
      ],
      ['Name'],
    ],
    [
      'pixel default widths follow',
      [
        { id: 'name', name: 'Name', isRowHeader: true },
        { id: 'inbox', name: 'Inbox', defaultWidth: 220 },
        { id: 'holder', name: 'Holder', defaultWidth: '2fr' as const },
        { id: 'acquired', name: 'Acquired', defaultWidth: 150 },
      ],
      ['Name', 'Inbox'],
    ],
  ])(
    'shows a resize handle only before another flexible column when %s',
    (_, columns, resizable) => {
      render(
        <PanelTable
          aria-label="Items"
          columns={columns}
          items={[{ id: 'one', name: 'One' }]}
          renderCell={(row) => <Cell>{row.name}</Cell>}
        />,
      );
      const headerTable = screen.getByRole('grid', { name: 'Items columns' });

      expect(
        Array.from(headerTable.querySelectorAll('th'))
          .filter((th) => th.querySelector('input[aria-label="Resizer"]'))
          .map((th) => th.textContent),
      ).toEqual(resizable);
    },
  );

  it('moves live body columns with the header while a column is resized and static ones once it ends', () => {
    const observerOf = stubResizeObservers();
    render(
      <PanelTable
        aria-label="Items"
        columns={[
          { id: 'name', name: 'Name', isRowHeader: true },
          { id: 'status', name: 'Status' },
        ]}
        items={Array.from({ length: 30 }, (_, index) => ({
          id: `row-${index}`,
          name: `Row ${index}`,
        }))}
        renderCell={(row) => <Cell>{row.name}</Cell>}
      />,
    );
    const headerTable = screen.getByRole('grid', { name: 'Items columns' });
    const body = screen.getByRole('grid', { name: 'Items' });
    const [nameHeader, statusHeader] = Array.from(
      headerTable.querySelectorAll('th'),
    );
    const resizer = headerTable.querySelector(
      'input[aria-label="Resizer"]',
    )?.parentElement;
    if (!nameHeader || !statusHeader || !resizer) {
      throw new Error('Header columns were not rendered');
    }
    const rects = new Map<Element, Pick<DOMRect, 'left' | 'width'>>([
      [headerTable, { left: 100, width: 300 }],
      [nameHeader, { left: 100, width: 120 }],
      [statusHeader, { left: 220, width: 180 }],
    ]);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: Element) {
        return { left: 0, width: 0, ...rects.get(this) } as DOMRect;
      },
    );
    const rowOf = (name: string) => {
      const row = screen
        .getAllByText(name)[0]
        ?.closest<HTMLElement>('[role=row]');
      if (!row) throw new Error(`Row ${name} was not rendered`);
      return row;
    };
    const wrapperWidth = (name: string, colIndex: number) =>
      rowOf(name).querySelector(`[aria-colindex="${colIndex}"]`)?.parentElement
        ?.style.width;

    expect(rowOf('Row 0').closest('[data-static-row]')).toBeNull();
    expect(rowOf('Row 29').closest('[data-static-row]')).not.toBeNull();
    const staticWidth = wrapperWidth('Row 29', 3);

    act(() => {
      fireEvent.pointerDown(resizer, { pointerId: 1, button: 0, clientX: 0 });
      fireEvent.pointerMove(document, { pointerId: 1, clientX: 40 });
    });
    observerOf(headerTable).notify();

    expect(
      body.querySelector<HTMLElement>('[role=columnheader][aria-colindex="2"]')
        ?.style.width,
    ).toBe('120px');
    expect(wrapperWidth('Row 0', 2)).toBe('120px');
    expect(wrapperWidth('Row 0', 3)).toBe('180px');
    expect(wrapperWidth('Row 29', 3)).toBe(staticWidth);

    act(() => {
      fireEvent.pointerUp(document, { pointerId: 1, clientX: 40 });
    });

    expect(wrapperWidth('Row 0', 3)).toBe('180px');
    expect(wrapperWidth('Row 29', 2)).toBe('120px');
    expect(wrapperWidth('Row 29', 3)).toBe('180px');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});

describe('PanelTable windowed', () => {
  const items = Array.from({ length: 30 }, (_, index) => ({
    id: `item-${index}`,
    name: `Item ${index}`,
  }));
  const rowOf = (name: string) => {
    const row = screen.getByText(name).closest<HTMLElement>('[role=row]');
    if (!row) throw new Error(`Row ${name} was not rendered`);
    return row;
  };
  const isStatic = (name: string) =>
    rowOf(name).closest('[data-static-row]') !== null;
  const settle = () =>
    act(() => new Promise((resolve) => setTimeout(resolve, 200)));
  const renderWindowed = (
    props: Partial<PanelTableProps<(typeof items)[number]>> = {},
  ) => (
    <PanelTable
      aria-label="Items"
      columns={[{ id: 'name', name: 'Name', isRowHeader: true }]}
      items={items}
      selectionMode="multiple"
      estimatedRowHeight={44}
      renderCell={(row) => <Cell>{row.name}</Cell>}
      {...props}
    />
  );

  beforeAll(() => {
    globalThis.ResizeObserver = ResizeObserverMock;
  });

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.hasAttribute('data-index') ? 44 : 0;
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the selection on rows rendered as static markup', async () => {
    const { rerender } = render(
      renderWindowed({ selectedKeys: new Set(['item-26']) }),
    );

    expect(isStatic('Item 26')).toBe(true);
    expect(rowOf('Item 26').getAttribute('aria-selected')).toBe('true');
    expect(rowOf('Item 27').getAttribute('aria-selected')).toBe('false');

    rerender(renderWindowed({ selectedKeys: new Set(['item-27']) }));
    await settle();

    expect(rowOf('Item 26').getAttribute('aria-selected')).toBe('false');
    expect(rowOf('Item 27').getAttribute('aria-selected')).toBe('true');
  });

  it('renders the rows of the first viewport as live rows from the start', () => {
    render(renderWindowed());

    expect(isStatic('Item 0')).toBe(false);
    expect(isStatic('Item 17')).toBe(false);
    expect(isStatic('Item 29')).toBe(true);
  });

  it('turns rows near the viewport into live rows once scrolling settles', async () => {
    render(renderWindowed());
    expect(isStatic('Item 29')).toBe(true);

    act(() => {
      vi.spyOn(window, 'scrollY', 'get').mockReturnValue(600);
      window.dispatchEvent(new Event('scroll'));
    });

    await waitFor(() => expect(isStatic('Item 29')).toBe(false), {
      timeout: 3000,
    });
  });

  it('turns a static row into a live row when the mouse moves over it', () => {
    render(renderWindowed());

    expect(isStatic('Item 25')).toBe(true);
    fireEvent.pointerOver(rowOf('Item 25'), { pointerType: 'touch' });
    expect(isStatic('Item 25')).toBe(true);

    fireEvent.pointerMove(rowOf('Item 25'), {
      pointerType: 'mouse',
      movementX: 2,
    });
    expect(isStatic('Item 25')).toBe(false);
  });

  it('selects a static row when its checkbox is clicked', () => {
    const onSelectionChange = vi.fn();
    render(renderWindowed({ selectedKeys: new Set(), onSelectionChange }));

    expect(isStatic('Item 25')).toBe(true);
    const checkbox = rowOf('Item 25').querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    if (!checkbox) throw new Error('Row checkbox was not rendered');
    fireEvent.pointerDown(checkbox, { pointerType: 'mouse' });
    fireEvent.pointerUp(checkbox, { pointerType: 'mouse' });
    fireEvent.click(checkbox, { detail: 1 });

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect([...(onSelectionChange.mock.lastCall?.[0] ?? [])]).toEqual([
      'item-25',
    ]);
    expect(isStatic('Item 25')).toBe(false);
    expect(document.activeElement).toBe(
      rowOf('Item 25').querySelector('input[type="checkbox"]'),
    );
  });

  it('runs the action of a static row when the row is clicked', () => {
    const onRowAction = vi.fn();
    render(renderWindowed({ onRowAction }));

    expect(isStatic('Item 25')).toBe(true);
    fireEvent.pointerDown(screen.getByText('Item 25'), {
      pointerType: 'mouse',
    });
    fireEvent.pointerUp(screen.getByText('Item 25'), { pointerType: 'mouse' });
    fireEvent.click(screen.getByText('Item 25'), { detail: 1 });

    expect(onRowAction).toHaveBeenCalledTimes(1);
    expect(onRowAction).toHaveBeenCalledWith('item-25');
    expect(document.activeElement).toBe(screen.getByText('Item 25'));
  });

  it('replays a screen reader click on a static checkbox without moving focus', () => {
    const onSelectionChange = vi.fn();
    render(renderWindowed({ selectedKeys: new Set(), onSelectionChange }));

    const checkbox = rowOf('Item 25').querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    if (!checkbox) throw new Error('Row checkbox was not rendered');
    fireEvent.click(checkbox);

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect([...(onSelectionChange.mock.lastCall?.[0] ?? [])]).toEqual([
      'item-25',
    ]);
    expect(document.activeElement).toBe(document.body);
  });

  it('keeps rows static while a finger is down in the table', async () => {
    render(renderWindowed());
    fireEvent.pointerDown(screen.getByText('Item 5'), {
      pointerId: 3,
      pointerType: 'touch',
    });

    act(() => {
      vi.spyOn(window, 'scrollY', 'get').mockReturnValue(600);
      window.dispatchEvent(new Event('scroll'));
    });
    for (let step = 0; step < 10; step++) {
      await act(() => new Promise((resolve) => setTimeout(resolve, 60)));
    }
    expect(isStatic('Item 29')).toBe(true);

    fireEvent.pointerUp(window, { pointerId: 3, pointerType: 'touch' });
    await waitFor(() => expect(isStatic('Item 29')).toBe(false), {
      timeout: 3000,
    });
  });

  it('selects a static row on a touch long press instead of running its action', async () => {
    const onRowAction = vi.fn();
    const onSelectionChange = vi.fn();
    render(
      renderWindowed({
        onRowAction,
        selectedKeys: new Set(),
        onSelectionChange,
      }),
    );

    expect(isStatic('Item 25')).toBe(true);
    fireEvent.pointerDown(screen.getByText('Item 25'), {
      pointerId: 4,
      pointerType: 'touch',
    });
    await act(() => new Promise((resolve) => setTimeout(resolve, 600)));
    fireEvent.pointerUp(window, { pointerId: 4, pointerType: 'touch' });
    fireEvent.click(screen.getByText('Item 25'), { detail: 1 });

    expect(onRowAction).not.toHaveBeenCalled();
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect([...(onSelectionChange.mock.lastCall?.[0] ?? [])]).toEqual([
      'item-25',
    ]);
  });

  it('names static row checkboxes like live ones and keeps them out of the tab order', () => {
    render(renderWindowed());

    expect(isStatic('Item 0')).toBe(false);
    expect(isStatic('Item 29')).toBe(true);
    expect(
      screen.getByRole('checkbox', { name: 'Select Item 0' }),
    ).toBeTruthy();
    const staticCheckbox = screen.getByRole('checkbox', {
      name: 'Select Item 29',
    });
    expect(staticCheckbox.getAttribute('tabindex')).toBe('-1');
    expect(staticCheckbox.hasAttribute('aria-readonly')).toBe(false);
    expect(screen.getByRole('row', { name: 'Item 29' })).toBe(rowOf('Item 29'));
  });

  it('leaves links and other controls in static rows to the browser', () => {
    const onRowAction = vi.fn();
    render(
      renderWindowed({
        onRowAction,
        renderCell: (row) => (
          <Cell>
            <a href={`#${row.id}`}>{row.name}</a>
            <span tabIndex={0}>{`${row.name} note`}</span>
          </Cell>
        ),
      }),
    );

    expect(isStatic('Item 25')).toBe(true);
    fireEvent.click(screen.getByText('Item 25'));
    fireEvent.click(screen.getByText('Item 25 note'));

    expect(onRowAction).not.toHaveBeenCalled();
    expect(isStatic('Item 25')).toBe(true);
  });

  it('replays clicks on elements that only take focus from script', () => {
    const onRowAction = vi.fn();
    render(
      renderWindowed({
        onRowAction,
        renderCell: (row) => (
          <Cell>
            <span tabIndex={-1}>{row.name}</span>
          </Cell>
        ),
      }),
    );

    expect(isStatic('Item 25')).toBe(true);
    fireEvent.pointerDown(screen.getByText('Item 25'), {
      pointerType: 'mouse',
    });
    fireEvent.pointerUp(screen.getByText('Item 25'), { pointerType: 'mouse' });
    fireEvent.click(screen.getByText('Item 25'), { detail: 1 });

    expect(onRowAction).toHaveBeenCalledTimes(1);
    expect(onRowAction).toHaveBeenCalledWith('item-25');
  });

  it('moves focus into the clicked cell of a static row without a focus ring', async () => {
    render(
      renderWindowed({
        renderCell: (row) => (
          <Cell>
            <span>{row.name}</span>
            <Button>{`Open ${row.name}`}</Button>
          </Cell>
        ),
      }),
    );

    expect(isStatic('Item 25')).toBe(true);
    fireEvent.pointerDown(screen.getByText('Item 25'), {
      pointerType: 'mouse',
    });
    fireEvent.pointerUp(screen.getByText('Item 25'), { pointerType: 'mouse' });
    fireEvent.click(screen.getByText('Item 25'), { detail: 1 });

    const button = screen.getByRole('button', { name: 'Open Item 25' });
    await waitFor(() => expect(document.activeElement).toBe(button));
    expect(button.hasAttribute('data-focus-visible')).toBe(false);
  });

  it('keeps a static row static while a menu opened from it is open', async () => {
    const onAction = vi.fn();
    render(
      renderWindowed({
        renderCell: (row) => (
          <Cell>
            <span>{row.name}</span>
            <MenuTrigger>
              <Button>{`Actions for ${row.name}`}</Button>
              <Popover>
                <Menu onAction={(key) => onAction(row.id, key)}>
                  <MenuItem id="kill">Kill</MenuItem>
                </Menu>
              </Popover>
            </MenuTrigger>
          </Cell>
        ),
      }),
    );

    expect(isStatic('Item 25')).toBe(true);
    const trigger = screen.getByRole('button', {
      name: 'Actions for Item 25',
    });
    fireEvent.pointerDown(trigger, { pointerType: 'touch' });
    fireEvent.pointerUp(trigger, { pointerType: 'touch' });
    fireEvent.click(trigger, { detail: 1 });
    expect(screen.getByRole('menu')).toBeTruthy();

    act(() => {
      vi.spyOn(window, 'scrollY', 'get').mockReturnValue(600);
      window.dispatchEvent(new Event('scroll'));
    });
    for (let step = 0; step < 10; step++) {
      await act(() => new Promise((resolve) => setTimeout(resolve, 60)));
    }
    expect(isStatic('Item 29')).toBe(false);
    expect(isStatic('Item 25')).toBe(true);

    fireEvent.click(screen.getByRole('menuitem', { name: 'Kill' }));
    expect(onAction).toHaveBeenCalledWith('item-25', 'kill');
  });

  it('keeps focus on a control focused in a static row', () => {
    render(
      renderWindowed({
        renderCell: (row) => (
          <Cell>
            <span>{row.name}</span>
            <Button>{`Open ${row.name}`}</Button>
          </Cell>
        ),
      }),
    );
    expect(isStatic('Item 25')).toBe(true);
    const button = screen.getByRole('button', { name: 'Open Item 25' });

    act(() => button.focus());
    expect(document.activeElement).toBe(button);

    act(() => rowOf('Item 1').focus());
    act(() => rowOf('Item 1').blur());
    act(() => button.focus());
    expect(document.activeElement).toBe(button);

    fireEvent.keyDown(button, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(rowOf('Item 26'));
  });

  it('renders the row React Aria focuses while the scroll range is frozen', () => {
    const manyItems = Array.from({ length: 300 }, (_, index) => ({
      id: `item-${index}`,
      name: `Item ${index}`,
    }));
    render(renderWindowed({ items: manyItems }));
    act(() => rowOf('Item 0').focus());

    act(() => {
      vi.spyOn(window, 'scrollY', 'get').mockReturnValue(3000);
      window.dispatchEvent(new Event('scroll'));
    });
    fireEvent.keyDown(rowOf('Item 0'), { key: 'End' });

    expect(document.activeElement).toBe(rowOf('Item 299'));
  });

  const manyItems = Array.from({ length: 300 }, (_, index) => ({
    id: `item-${index}`,
    name: `Item ${index}`,
  }));
  const jumpTo = (scrollY: number) =>
    act(() => {
      vi.spyOn(window, 'scrollY', 'get').mockReturnValue(scrollY);
      window.dispatchEvent(new Event('scroll'));
    });

  it('renders the rows a fast scroll reaches on narrow tables', () => {
    render(renderWindowed({ items: manyItems }));
    expect(screen.queryByText('Item 185')).toBeNull();

    jumpTo(8000);

    expect(screen.queryByText('Item 185')).not.toBeNull();
  });

  const wideTable = () =>
    renderWindowed({
      items: manyItems,
      columns: Array.from({ length: 10 }, (_, index) => ({
        id: `column-${index}`,
        name: `Column ${index}`,
        isRowHeader: index === 0,
      })),
      renderCell: (row, column) => (
        <Cell>{column.id === 'column-0' ? row.name : null}</Cell>
      ),
    });

  it('follows a fast scroll on wide tables while each frame adds few rows', () => {
    render(wideTable());

    for (const scrollY of [650, 1300, 1950, 2600]) jumpTo(scrollY);

    expect(screen.queryByText('Item 70')).not.toBeNull();
    expect(screen.queryByText('Item 95')).toBeNull();
  });

  it('shows stubs while a fast scroll needs more new cells than a frame allows', async () => {
    render(wideTable());
    expect(screen.queryByText('Item 115')).toBeNull();

    jumpTo(5000);

    expect(screen.queryByText('Item 115')).toBeNull();
    await waitFor(() => expect(screen.queryByText('Item 115')).not.toBeNull(), {
      timeout: 3000,
    });
  });

  it('renders static cell content with the default collection renderer', () => {
    function RendererProbe() {
      const renderer = useContext(CollectionRendererContext);
      return renderer === DefaultCollectionRenderer ? 'default' : 'windowed';
    }
    render(
      renderWindowed({
        renderCell: (row) => (
          <Cell>
            <span>{row.name}</span>
            <RendererProbe />
          </Cell>
        ),
      }),
    );

    expect(isStatic('Item 29')).toBe(true);
    expect(rowOf('Item 29').textContent).toBe('Item 29default');
  });

  const parents = items.map((item) => ({
    id: item.id.replace('item', 'parent'),
    name: item.name.replace('Item', 'Parent'),
  }));
  const renderTree = (
    expandedKeys: Set<string>,
    props: Partial<PanelTableProps<(typeof parents)[number]>> = {},
  ) => (
    <PanelTable
      aria-label="Items"
      columns={[{ id: 'name', name: 'Name', isRowHeader: true }]}
      items={parents}
      treeColumn="name"
      expandedKeys={expandedKeys}
      estimatedRowHeight={44}
      renderCell={(row) => <Cell>{row.name}</Cell>}
      renderChildRows={(row, columns) => (
        <Collection
          items={[{ id: `${row.id}-child`, name: `${row.name} child` }]}
        >
          {(child) => (
            <Row id={child.id} columns={columns} hasLeadingCell>
              {(col) => (
                <Cell key={col.id}>
                  {col.id === 'name' ? child.name : null}
                </Cell>
              )}
            </Row>
          )}
        </Collection>
      )}
      {...props}
    />
  );

  it('marks static tree rows as expanded and renders their child rows after them', () => {
    const { rerender } = render(renderTree(new Set(['parent-27'])));

    const parent = rowOf('Parent 27');
    const child = rowOf('Parent 27 child');
    expect(isStatic('Parent 27')).toBe(true);
    expect(isStatic('Parent 27 child')).toBe(true);
    expect(parent.getAttribute('data-expanded')).toBe('true');
    expect(parent.getAttribute('aria-expanded')).toBe('true');
    expect(parent.getAttribute('aria-level')).toBe('1');
    expect(parent.hasAttribute('aria-rowindex')).toBe(false);
    expect(child.getAttribute('aria-level')).toBe('2');
    expect(rowOf('Parent 26').getAttribute('aria-expanded')).toBe('false');
    expect(
      parent.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    rerender(renderTree(new Set()));

    expect(screen.queryByText('Parent 27 child')).toBeNull();
    expect(rowOf('Parent 27').hasAttribute('data-expanded')).toBe(false);
  });

  it('expands a static tree row from its chevron', () => {
    const onExpandedChange = vi.fn();
    render(
      renderTree(new Set(), {
        onExpandedChange,
        renderCell: (row) => (
          <Cell>
            <Button slot="chevron">Toggle</Button>
            {row.name}
          </Cell>
        ),
      }),
    );

    expect(isStatic('Parent 27')).toBe(true);
    const chevron = rowOf('Parent 27').querySelector('button');
    if (!chevron) throw new Error('Chevron was not rendered');
    expect(chevron.getAttribute('aria-label')).toBe('Expand');
    expect(chevron.getAttribute('tabindex')).toBe('-1');
    fireEvent.click(chevron);

    expect(onExpandedChange).toHaveBeenCalledTimes(1);
    expect(onExpandedChange).toHaveBeenLastCalledWith(new Set(['parent-27']));
  });

  it('mounts fewer rows ahead of the viewport when rows have many cells', async () => {
    const rows = Array.from({ length: 160 }, (_, index) => ({
      id: `row-${index}`,
      name: `Row ${index}`,
    }));
    const columnsOf = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        id: `c${index}`,
        name: `C${index}`,
        isRowHeader: index === 0,
      }));
    const mountedRows = () =>
      screen
        .getByRole('grid', { name: 'Items' })
        .querySelectorAll('[data-index]').length;
    const settledMountedRows = async () => {
      let count = mountedRows();
      for (let unchanged = 0; unchanged < 4;) {
        await act(() => new Promise((resolve) => setTimeout(resolve, 100)));
        const next = mountedRows();
        unchanged = next === count ? unchanged + 1 : 0;
        count = next;
      }
      return count;
    };
    const renderTable = (columnCount: number) =>
      render(
        <PanelTable
          aria-label="Items"
          columns={columnsOf(columnCount)}
          items={rows}
          estimatedRowHeight={44}
          renderCell={(row) => <Cell>{row.name}</Cell>}
        />,
      );

    const narrow = renderTable(1);
    expect(await settledMountedRows()).toBe(160);
    narrow.unmount();

    renderTable(30);
    const wide = await settledMountedRows();
    expect(wide).toBeGreaterThan(30);
    expect(wide).toBeLessThan(60);
  }, 20_000);

  it('selects every row from the header checkbox', () => {
    const onSelectionChange = vi.fn();
    render(renderWindowed({ selectedKeys: new Set(), onSelectionChange }));

    const selectAll = screen
      .getByRole('grid', { name: 'Items columns' })
      .querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!selectAll) throw new Error('Select-all checkbox was not rendered');
    fireEvent.click(selectAll);

    expect(onSelectionChange).toHaveBeenLastCalledWith(
      new Set(items.map((item) => item.id)),
    );
  });
});
