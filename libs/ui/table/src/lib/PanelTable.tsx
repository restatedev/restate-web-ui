import {
  CSSProperties,
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Table as AriaTable,
  TableBody as AriaTableBody,
  TableProps as AriaTableProps,
  ColumnProps as AriaColumnProps,
  Column as AriaColumn,
  ResizableTableContainer,
  Toolbar as AriaToolbar,
  Virtualizer,
} from 'react-aria-components';
import type { Key, SortDescriptor } from 'react-aria-components';
import { tv } from '@restate/util/styles';
import { Cell, Row } from './Row';
import { Column, TableHeader, TableBody } from './Table';
import { getNextSortDescriptor } from './sort';
import { PanelTableLayout } from './PanelTableLayout';

export interface PanelTableColumn<TId extends string = string> {
  id: TId;
  name: ReactNode;
  isRowHeader?: boolean;
  allowsSorting?: boolean;
  preferredSortDirection?: SortDescriptor['direction'];
  sortDirections?: readonly SortDescriptor['direction'][];
  defaultWidth?: AriaColumnProps['defaultWidth'];
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  hideLabel?: boolean;
}

export interface PanelTableProps<
  T extends { id: string },
  TColId extends string = string,
> extends Pick<
  AriaTableProps,
  | 'aria-label'
  | 'selectionMode'
  | 'selectedKeys'
  | 'onRowAction'
  | 'treeColumn'
  | 'expandedKeys'
  | 'defaultExpandedKeys'
  | 'onExpandedChange'
> {
  sortDescriptor?: SortDescriptor;
  onSortChange?: (descriptor: SortDescriptor | undefined) => void;
  columns: PanelTableColumn<TColId>[];
  items: T[];
  isLoading?: boolean;
  error?: Error | null;
  numOfRows?: number;
  emptyPlaceholder?: ReactNode;
  bodyDependencies?: unknown[];
  bodyKey?: string | number;
  onSelectionChange?: (keys: Set<Key>) => void;
  renderCell: (row: T, col: PanelTableColumn<TColId>) => ReactElement;
  renderChildRows?: (row: T, columns: PanelTableColumn[]) => ReactNode;
  rowClassName?: string | ((row: T) => string);
  rowDependencies?: unknown[];
  toolbar?: ReactNode;
  toolbarWrapperClassName?: string;
  toolbarClassName?: string;
  virtualized?: boolean;
  estimatedRowHeight?: number;
  bodyHeadingHeight?: number;
  bodyContainerClassName?: string;
  caption?: ReactNode;
}

const SELECTION_WIDTH = 36;
const SPACER_WIDTH = 8;
const LEFT_SPACER_ID = '__panel_table_spacer_left__';
const RIGHT_SPACER_ID = '__panel_table_spacer_right__';

const styles = tv({
  slots: {
    stickyHeaderWrapper:
      'sticky top-[calc(var(--cp-toolbar-top,0px)+var(--cp-toolbar-height,0px)+0.5rem-var(--cp-toolbar-tuck,0px))] z-40 mx-2 mt-[calc(0.5rem+var(--cp-toolbar-tuck,0px))] -mb-9 h-9',
    stickyHeaderBackdrop:
      'pointer-events-none absolute inset-0 rounded-xl border border-gray-200 bg-linear-to-b from-gray-200/70 to-gray-100/85 shadow-[inset_0_2px_0_0_--theme(--color-white/95%),0_2px_5px_-1px_--theme(--color-zinc-800/8%),0_4px_10px_-3px_--theme(--color-zinc-800/6%)] backdrop-blur-3xl backdrop-saturate-200',
    stickyHeaderContent: 'relative h-full w-full overflow-hidden',
    stickyHeaderScroll:
      'relative h-full [scrollbar-width:none] overflow-auto [&::-webkit-scrollbar]:hidden',
    stickyHeaderTable: 'w-full border-separate border-spacing-0',
    stickyHeaderInner:
      'static z-auto bg-transparent drop-shadow-none backdrop-blur-none backdrop-saturate-100 supports-[-moz-appearance:none]:bg-transparent [&_.checkbox]:border-gray-200! [&_.checkbox]:shadow-[inset_0_0.5px_0.5px_0px_rgba(0,0,0,0.08)]!',
    stickyHeaderTrailingResizerHidden:
      '[&_th:nth-last-child(2)_[data-resizable-direction]]:invisible',
    stickyToolbarWrapper:
      'sticky top-[calc(var(--cp-toolbar-top,0px)+var(--cp-toolbar-height,0px)+3.25rem-var(--cp-toolbar-tuck,0px))] z-30 mx-2 mt-11 -mb-8 h-8',
    stickyToolbar:
      'relative flex h-full min-w-0 items-center gap-1.5 border-y border-blue-100 bg-blue-50/90 px-2 text-xs backdrop-blur-3xl backdrop-saturate-200 supports-[-moz-appearance:none]:bg-blue-50',
    dataTableScroll: 'relative [scrollbar-width:thin] overflow-auto',
    dataTableInner: 'w-full border-separate border-spacing-0',
    dataTableSpacerHeader:
      'invisible static z-auto h-(--panel-table-body-heading-height) w-[inherit] overflow-hidden bg-transparent drop-shadow-none backdrop-blur-none backdrop-saturate-100 supports-[-moz-appearance:none]:bg-transparent [&_[role=columnheader]]:overflow-hidden [&_[role=columnheader]]:border-0 [&_[role=columnheader]]:p-0 [&_th]:h-(--panel-table-body-heading-height) [&_th]:overflow-hidden [&_th]:border-0 [&_th]:p-0',
  },
  variants: {
    virtualized: {
      true: {
        dataTableInner:
          'block [&_[role=columnheader]]:box-border [&_[role=columnheader]]:h-full [&_[role=columnheader]]:w-full [&_[role=gridcell]]:box-border [&_[role=gridcell]]:h-full [&_[role=gridcell]]:w-full [&_[role=gridcell]]:border-b! [&_[role=row]]:h-[inherit] [&_[role=row]]:w-[inherit] [&_[role=rowgroup]]:h-[inherit] [&_[role=rowgroup]]:w-[inherit] [&_[role=rowheader]]:box-border [&_[role=rowheader]]:h-full [&_[role=rowheader]]:w-full [&_[role=rowheader]]:border-b!',
      },
    },
  },
});

export function PanelTable<
  T extends { id: string },
  TColId extends string = string,
>({
  columns,
  items,
  renderCell,
  renderChildRows,
  rowClassName,
  rowDependencies,
  selectionMode,
  selectedKeys,
  onSelectionChange,
  onRowAction,
  sortDescriptor,
  onSortChange,
  treeColumn,
  expandedKeys,
  defaultExpandedKeys,
  onExpandedChange,
  isLoading,
  error,
  numOfRows,
  emptyPlaceholder,
  bodyDependencies,
  bodyKey,
  toolbar,
  toolbarWrapperClassName,
  toolbarClassName,
  virtualized = true,
  estimatedRowHeight = 44,
  bodyHeadingHeight = 36,
  bodyContainerClassName,
  caption,
  ...ariaProps
}: PanelTableProps<T, TColId>) {
  const ariaLabel = ariaProps['aria-label'];
  const {
    stickyHeaderWrapper,
    stickyHeaderBackdrop,
    stickyHeaderContent,
    stickyHeaderScroll,
    stickyHeaderTable,
    stickyHeaderInner,
    stickyHeaderTrailingResizerHidden,
    stickyToolbarWrapper,
    stickyToolbar,
    dataTableScroll,
    dataTableInner,
    dataTableSpacerHeader,
  } = styles({ virtualized });

  const [columnWidths, setColumnWidths] = useState<Map<Key, number>>(
    () => new Map(),
  );
  const [stickyHeaderScrollEl, setStickyHeaderScrollEl] =
    useState<HTMLDivElement | null>(null);
  const [dataTableScrollEl, setDataTableScrollEl] =
    useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!stickyHeaderScrollEl || !dataTableScrollEl) return;
    const onScroll = () => {
      stickyHeaderScrollEl.scrollLeft = dataTableScrollEl.scrollLeft;
    };
    dataTableScrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => dataTableScrollEl.removeEventListener('scroll', onScroll);
  }, [dataTableScrollEl, stickyHeaderScrollEl]);

  useEffect(() => {
    if (!stickyHeaderScrollEl) return;
    const update = () => {
      const ths = stickyHeaderScrollEl.querySelectorAll('thead th[data-key]');
      const next = new Map<Key, number>();
      ths.forEach((th) => {
        const key = th.getAttribute('data-key');
        if (!key) return;
        next.set(key, th.getBoundingClientRect().width);
      });
      setColumnWidths((prev) => {
        if (prev.size === next.size) {
          let same = true;
          for (const [k, v] of next) {
            if (prev.get(k) !== v) {
              same = false;
              break;
            }
          }
          if (same) return prev;
        }
        return next;
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stickyHeaderScrollEl);
    stickyHeaderScrollEl
      .querySelectorAll('thead th')
      .forEach((th) => observer.observe(th));
    return () => observer.disconnect();
  }, [stickyHeaderScrollEl]);

  const handleColumnResize = useCallback(
    (widths: Map<Key, number | string>) => {
      const numericWidths = new Map<Key, number>();
      widths.forEach((size, key) => {
        if (typeof size === 'number') numericWidths.set(key, size);
      });
      setColumnWidths(numericWidths);
    },
    [],
  );

  const handleSelectionChange = useCallback(
    (keys: 'all' | Set<Key>) => {
      if (!onSelectionChange) return;
      if (keys === 'all') {
        onSelectionChange(new Set(items.map((item) => item.id)));
      } else {
        onSelectionChange(keys);
      }
    },
    [onSelectionChange, items],
  );

  const handleSortChange = useCallback(
    (descriptor: SortDescriptor) => {
      const column = columns.find(({ id }) => id === descriptor.column);
      if (!column || !onSortChange) return;
      onSortChange(
        getNextSortDescriptor(
          sortDescriptor,
          descriptor.column,
          column.preferredSortDirection,
          column.sortDirections,
        ),
      );
    },
    [columns, onSortChange, sortDescriptor],
  );

  const stickyHeaderItems = useMemo(() => items.slice(0, 2), [items]);

  const stickyHeaderSelectedKeys = useMemo(() => {
    if (selectedKeys === 'all') return 'all';
    if (!selectedKeys || !items.length) return selectedKeys;
    const set =
      selectedKeys instanceof Set
        ? (selectedKeys as Set<Key>)
        : new Set<Key>(selectedKeys as Iterable<Key>);
    const selectedItemCount = items.reduce(
      (count, item) => count + Number(set.has(item.id)),
      0,
    );
    if (selectedItemCount === items.length) return 'all';
    if (selectedItemCount === 0) return new Set<Key>();
    const firstStickyItem = stickyHeaderItems[0];
    return firstStickyItem
      ? new Set<Key>([firstStickyItem.id])
      : new Set<Key>();
  }, [selectedKeys, items, stickyHeaderItems]);

  const lastIsFixed = columns[columns.length - 1]?.width !== undefined;

  const dataTableColumns = useMemo<PanelTableColumn[]>(
    () => [
      ...columns,
      {
        id: RIGHT_SPACER_ID,
        name: '',
        width: SPACER_WIDTH,
        hideLabel: true,
      },
    ],
    [columns],
  );

  const leadingColumn = (
    <AriaColumn
      id={LEFT_SPACER_ID}
      width={SPACER_WIDTH}
      minWidth={SPACER_WIDTH}
      className="p-0"
    />
  );

  const renderBodyRow = useCallback(
    (item: T) => (
      <Row
        id={item.id}
        columns={dataTableColumns}
        dependencies={[...(rowDependencies ?? []), dataTableColumns]}
        className={
          typeof rowClassName === 'function' ? rowClassName(item) : rowClassName
        }
        leadingCell={<Cell />}
        childRows={renderChildRows?.(item, dataTableColumns)}
      >
        {(col) => {
          if (col.id === RIGHT_SPACER_ID) {
            return <Cell key={col.id} />;
          }
          return renderCell(item, col as PanelTableColumn<TColId>);
        }}
      </Row>
    ),
    [
      renderCell,
      renderChildRows,
      rowClassName,
      rowDependencies,
      dataTableColumns,
    ],
  );

  const renderColumns = (
    variant: 'stickyHeader' | 'dataTable',
    cols: PanelTableColumn[],
  ) =>
    cols.map((col) => {
      const synced = columnWidths.get(col.id);
      const isFixed = typeof col.width === 'number';
      const widthProps: Pick<
        AriaColumnProps,
        'width' | 'defaultWidth' | 'minWidth' | 'maxWidth'
      > = isFixed
        ? { width: col.width }
        : variant === 'dataTable' && typeof synced === 'number'
          ? { width: synced, minWidth: col.minWidth, maxWidth: col.maxWidth }
          : {
              defaultWidth: col.defaultWidth,
              minWidth: col.minWidth,
              maxWidth: col.maxWidth,
            };

      return (
        <Column
          key={col.id}
          id={col.id}
          isRowHeader={col.isRowHeader}
          allowsSorting={
            variant === 'stickyHeader' &&
            Boolean(onSortChange) &&
            col.allowsSorting
          }
          {...widthProps}
          className={col.hideLabel ? 'opacity-0' : undefined}
        >
          {col.hideLabel ? (
            <span className="sr-only">{col.name}</span>
          ) : (
            col.name
          )}
        </Column>
      );
    });

  const dataTableSelectionWidth =
    selectionMode && selectionMode !== 'none' ? SELECTION_WIDTH : undefined;
  const layoutOptions = useMemo(
    () => ({ estimatedRowHeight, headingHeight: bodyHeadingHeight }),
    [bodyHeadingHeight, estimatedRowHeight],
  );
  const bodyHeadingStyle = {
    '--panel-table-body-heading-height': `${bodyHeadingHeight}px`,
  } as CSSProperties;

  const dataTable = (
    <AriaTable
      aria-label={ariaLabel}
      key={bodyKey}
      selectionMode={selectionMode}
      selectedKeys={selectedKeys}
      onSelectionChange={handleSelectionChange}
      onRowAction={onRowAction}
      treeColumn={treeColumn}
      expandedKeys={expandedKeys}
      defaultExpandedKeys={defaultExpandedKeys}
      onExpandedChange={onExpandedChange}
      className={dataTableInner()}
    >
      <TableHeader
        className={dataTableSpacerHeader()}
        selectionColumnWidth={dataTableSelectionWidth}
        leadingColumn={leadingColumn}
      >
        {renderColumns('dataTable', dataTableColumns)}
      </TableHeader>
      <TableBody
        items={items}
        dependencies={[...(bodyDependencies ?? []), dataTableColumns]}
        error={error}
        isLoading={isLoading}
        numOfColumns={dataTableColumns.length}
        numOfRows={numOfRows}
        emptyPlaceholder={emptyPlaceholder}
        loadingLeadingCell={<Cell />}
      >
        {renderBodyRow}
      </TableBody>
    </AriaTable>
  );

  const body = virtualized ? (
    <Virtualizer layout={PanelTableLayout} layoutOptions={layoutOptions}>
      {dataTable}
    </Virtualizer>
  ) : (
    dataTable
  );

  return (
    <>
      <div className={stickyHeaderWrapper()}>
        <div aria-hidden className={stickyHeaderBackdrop()} />
        <div className={stickyHeaderContent()}>
          <div ref={setStickyHeaderScrollEl} className={stickyHeaderScroll()}>
            <ResizableTableContainer onResize={handleColumnResize}>
              <AriaTable
                aria-label={ariaLabel ? `${ariaLabel} columns` : undefined}
                selectionMode={selectionMode}
                selectedKeys={stickyHeaderSelectedKeys}
                onSelectionChange={handleSelectionChange}
                sortDescriptor={sortDescriptor}
                onSortChange={handleSortChange}
                className={stickyHeaderTable()}
              >
                <TableHeader
                  className={[
                    stickyHeaderInner(),
                    lastIsFixed ? stickyHeaderTrailingResizerHidden() : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {renderColumns('stickyHeader', columns)}
                </TableHeader>
                <AriaTableBody
                  items={stickyHeaderItems}
                  dependencies={[columns]}
                >
                  {(row) => (
                    <Row
                      id={row.id}
                      columns={columns}
                      dependencies={[columns]}
                      className="hidden"
                    >
                      {(col) => <Cell key={col.id} />}
                    </Row>
                  )}
                </AriaTableBody>
              </AriaTable>
            </ResizableTableContainer>
          </div>
        </div>
      </div>
      {toolbar && (
        <div
          className={stickyToolbarWrapper({
            className: toolbarWrapperClassName,
          })}
        >
          <AriaToolbar
            aria-label={ariaLabel ? `${ariaLabel} tools` : 'Table tools'}
            className={stickyToolbar({ className: toolbarClassName })}
          >
            {toolbar}
          </AriaToolbar>
        </div>
      )}
      {virtualized ? (
        <ResizableTableContainer>
          <div
            ref={setDataTableScrollEl}
            data-panel-table-body-scroll
            style={bodyHeadingStyle}
            className={dataTableScroll({
              className: bodyContainerClassName,
            })}
          >
            {caption}
            {body}
          </div>
        </ResizableTableContainer>
      ) : (
        <div
          ref={setDataTableScrollEl}
          data-panel-table-body-scroll
          style={bodyHeadingStyle}
          className={dataTableScroll({ className: bodyContainerClassName })}
        >
          {caption}
          <ResizableTableContainer>{body}</ResizableTableContainer>
        </div>
      )}
    </>
  );
}
