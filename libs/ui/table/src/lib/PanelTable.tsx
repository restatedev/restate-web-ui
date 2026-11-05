import {
  CSSProperties,
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
import { tv } from '@restate/util-styles';
import { Cell, Row, type RowDataAttributes } from './Row';
import { Column, TableHeader, TableBody } from './Table';
import { getNextSortDescriptor } from './sort';
import { PanelTableLayout } from './PanelTableLayout';
import { columnKey, fromColumnKey, tableBodyKeyProps } from './keys';
import {
  keepIfSame,
  LEFT_SPACER_ID,
  measureColumnWidths,
  RIGHT_SPACER_ID,
  SPACER_WIDTH,
  syncDataTableColumns,
} from './columnSync';

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
  | 'disabledKeys'
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
  rowDataAttributes?: (row: T) => RowDataAttributes;
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

function isFlexible(col: PanelTableColumn) {
  if (typeof col.width === 'number') return false;
  return (
    col.defaultWidth == null ||
    (typeof col.defaultWidth === 'string' && col.defaultWidth.endsWith('fr'))
  );
}

const styles = tv({
  slots: {
    stickyHeaderWrapper:
      'sticky top-[calc(var(--cp-toolbar-top,0px)+var(--cp-toolbar-height,0px)+0.5rem-var(--cp-toolbar-tuck,0px))] z-40 mx-2 mt-[calc(0.5rem+var(--cp-toolbar-tuck,0px))] -mb-9 h-9',
    stickyHeaderBackdrop:
      'pointer-events-none absolute inset-0 rounded-xl border border-default bg-linear-to-b from-(--sheen-emphasis)/70 to-muted/80 shadow-[inset_0_2px_0_0_--theme(--box-shadow-color-edge/95%),0_2px_5px_-1px_--theme(--box-shadow-color-default/8%),0_4px_10px_-3px_--theme(--box-shadow-color-default/6%)] backdrop-blur-3xl backdrop-saturate-200',
    stickyHeaderContent: 'relative h-full w-full overflow-hidden',
    stickyHeaderScroll:
      'relative h-full [scrollbar-width:none] overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden',
    stickyHeaderTable: 'w-full border-separate border-spacing-0',
    stickyHeaderInner:
      'static z-auto bg-transparent drop-shadow-none backdrop-blur-none backdrop-saturate-100 supports-[-moz-appearance:none]:bg-transparent [&_.checkbox]:border-default! [&_.checkbox]:shadow-[inset_0_0.5px_0.5px_0px_--theme(--box-shadow-color-default/8%)]!',
    stickyToolbarWrapper:
      'sticky top-[calc(var(--cp-toolbar-top,0px)+var(--cp-toolbar-height,0px)+3.25rem-var(--cp-toolbar-tuck,0px))] z-30 mx-2 mt-11 -mb-8 h-8',
    stickyToolbar:
      'relative flex h-full min-w-0 items-center gap-1.5 border-y border-accent bg-accent-subtle/90 px-2 text-xs backdrop-blur-3xl backdrop-saturate-200 supports-[-moz-appearance:none]:bg-accent-subtle',
    dataTableScroll:
      'relative [scrollbar-width:thin] overflow-x-auto overflow-y-hidden',
    dataTableInner: 'w-full border-separate border-spacing-0',
    dataTableCaption: 'sticky left-0',
    dataTableSpacerHeader:
      'invisible static z-auto h-(--panel-table-body-heading-height) w-[inherit] overflow-hidden bg-transparent drop-shadow-none backdrop-blur-none backdrop-saturate-100 supports-[-moz-appearance:none]:bg-transparent [&_[role=columnheader]]:overflow-hidden [&_[role=columnheader]]:border-0 [&_[role=columnheader]]:p-0 [&_th]:h-(--panel-table-body-heading-height) [&_th]:overflow-hidden [&_th]:border-0 [&_th]:p-0',
  },
  variants: {
    virtualized: {
      true: {
        dataTableInner:
          'block [&_[role=columnheader]]:box-border [&_[role=columnheader]]:h-full [&_[role=columnheader]]:w-full [&_[role=gridcell]]:box-border [&_[role=gridcell]]:h-full [&_[role=gridcell]]:min-h-[43px] [&_[role=gridcell]]:w-full [&_[role=gridcell]]:border-b! [&_[role=row]]:h-[inherit] [&_[role=row]]:w-[inherit] [&_[role=rowgroup]]:relative [&_[role=rowgroup]]:h-[inherit] [&_[role=rowgroup]]:w-[inherit] [&_[role=rowgroup]]:[background-image:linear-gradient(to_top,var(--border-color-default)_1px,transparent_1px)] [&_[role=rowgroup]]:[background-size:var(--panel-table-skeleton-size)] [&_[role=rowgroup]]:[background-repeat:repeat-y] [&_[role=rowgroup]]:before:pointer-events-none [&_[role=rowgroup]]:before:absolute [&_[role=rowgroup]]:before:inset-0 [&_[role=rowgroup]]:before:bg-emphasis/70 [&_[role=rowgroup]]:before:[mask-image:var(--panel-table-skeleton)] [&_[role=rowgroup]]:before:[mask-size:var(--panel-table-skeleton-size)] [&_[role=rowgroup]]:before:[mask-repeat:repeat-y] [&_[role=rowgroup]]:before:content-[""] [&_[role=rowgroup]>[role=presentation]]:bg-subtle [&_[role=rowheader]]:box-border [&_[role=rowheader]]:h-full [&_[role=rowheader]]:min-h-[43px] [&_[role=rowheader]]:w-full [&_[role=rowheader]]:border-b!',
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
  rowDataAttributes,
  rowDependencies,
  selectionMode,
  selectedKeys,
  disabledKeys,
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
  estimatedRowHeight = 43,
  bodyHeadingHeight = 36,
  bodyContainerClassName,
  caption,
  ...ariaProps
}: PanelTableProps<T, TColId>) {
  const ariaLabel = ariaProps['aria-label'];
  const isVirtualized = virtualized && items.length > 0;
  const {
    stickyHeaderWrapper,
    stickyHeaderBackdrop,
    stickyHeaderContent,
    stickyHeaderScroll,
    stickyHeaderTable,
    stickyHeaderInner,
    stickyToolbarWrapper,
    stickyToolbar,
    dataTableScroll,
    dataTableInner,
    dataTableSpacerHeader,
    dataTableCaption,
  } = styles({ virtualized: isVirtualized });

  const [columnWidths, setColumnWidths] = useState<Map<Key, number>>(
    () => new Map(),
  );
  const isResizingRef = useRef(false);
  const [stickyHeaderScrollEl, setStickyHeaderScrollEl] =
    useState<HTMLDivElement | null>(null);
  const [dataTableScrollEl, setDataTableScrollEl] =
    useState<HTMLDivElement | null>(null);

  const dataTableScrollRef = useCallback((element: HTMLDivElement | null) => {
    setDataTableScrollEl(element);
    if (!element) return;
    const observer = new ResizeObserver(() => {
      element.style.setProperty(
        '--panel-table-viewport-width',
        `${element.clientWidth}px`,
      );
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      setDataTableScrollEl(null);
    };
  }, []);

  useEffect(() => {
    if (!stickyHeaderScrollEl || !dataTableScrollEl) return;
    const echoes = new Map<HTMLElement, number>();
    const follow = (source: HTMLElement, target: HTMLElement) => () => {
      const echo = echoes.get(source);
      echoes.delete(source);
      if (echo === source.scrollLeft) return;
      const previous = target.scrollLeft;
      target.scrollLeft = source.scrollLeft;
      if (target.scrollLeft !== previous) {
        echoes.set(target, target.scrollLeft);
      }
    };
    const onBodyScroll = follow(dataTableScrollEl, stickyHeaderScrollEl);
    const onHeaderScroll = follow(stickyHeaderScrollEl, dataTableScrollEl);
    dataTableScrollEl.addEventListener('scroll', onBodyScroll, {
      passive: true,
    });
    stickyHeaderScrollEl.addEventListener('scroll', onHeaderScroll, {
      passive: true,
    });
    onHeaderScroll();
    return () => {
      dataTableScrollEl.removeEventListener('scroll', onBodyScroll);
      stickyHeaderScrollEl.removeEventListener('scroll', onHeaderScroll);
    };
  }, [dataTableScrollEl, stickyHeaderScrollEl]);

  useEffect(() => {
    if (!stickyHeaderScrollEl) return;
    const observed = new WeakSet<Element>();
    const update = () => {
      stickyHeaderScrollEl
        .querySelectorAll('table, thead th')
        .forEach((element) => {
          if (observed.has(element)) return;
          observed.add(element);
          observer.observe(element);
        });
      if (dataTableScrollEl) {
        syncDataTableColumns(stickyHeaderScrollEl, dataTableScrollEl);
      }
      if (isResizingRef.current) return;
      const next = measureColumnWidths(stickyHeaderScrollEl);
      setColumnWidths((prev) => keepIfSame(prev, next));
    };
    const observer = new ResizeObserver(update);
    observer.observe(stickyHeaderScrollEl);
    update();
    return () => observer.disconnect();
  }, [dataTableScrollEl, stickyHeaderScrollEl]);

  const handleResizeStart = useCallback(() => {
    isResizingRef.current = true;
  }, []);

  const handleResizeEnd = useCallback(() => {
    isResizingRef.current = false;
    if (!stickyHeaderScrollEl) return;
    const next = measureColumnWidths(stickyHeaderScrollEl);
    setColumnWidths((prev) => keepIfSame(prev, next));
  }, [stickyHeaderScrollEl]);

  const selectableItems = useMemo(() => {
    const disabled = new Set<Key>(disabledKeys ?? []);
    return disabled.size
      ? items.filter((item) => !disabled.has(item.id))
      : items;
  }, [disabledKeys, items]);

  const handleSelectionChange = useCallback(
    (keys: 'all' | Set<Key>) => {
      if (!onSelectionChange) return;
      if (keys === 'all') {
        onSelectionChange(new Set(selectableItems.map((item) => item.id)));
      } else {
        onSelectionChange(keys);
      }
    },
    [onSelectionChange, selectableItems],
  );

  const handleSortChange = useCallback(
    (descriptor: SortDescriptor) => {
      const columnId = fromColumnKey(descriptor.column);
      const column = columns.find(({ id }) => id === columnId);
      if (!column || !onSortChange) return;
      onSortChange(
        getNextSortDescriptor(
          sortDescriptor,
          columnId,
          column.preferredSortDirection,
          column.sortDirections,
        ),
      );
    },
    [columns, onSortChange, sortDescriptor],
  );

  const stickyHeaderSortDescriptor = useMemo(
    () =>
      sortDescriptor && {
        ...sortDescriptor,
        column: columnKey(sortDescriptor.column),
      },
    [sortDescriptor],
  );

  const stickyHeaderItems = useMemo(() => items.slice(0, 2), [items]);

  const stickyHeaderSelectedKeys = useMemo(() => {
    if (selectedKeys === 'all') return 'all';
    if (!selectedKeys || !selectableItems.length) return selectedKeys;
    const set =
      selectedKeys instanceof Set
        ? (selectedKeys as Set<Key>)
        : new Set<Key>(selectedKeys as Iterable<Key>);
    const selectedItemCount = selectableItems.reduce(
      (count, item) => count + Number(set.has(item.id)),
      0,
    );
    if (selectedItemCount === selectableItems.length) return 'all';
    if (selectedItemCount === 0) return new Set<Key>();
    const firstStickyItem = stickyHeaderItems[0];
    return firstStickyItem
      ? new Set<Key>([firstStickyItem.id])
      : new Set<Key>();
  }, [selectedKeys, selectableItems, stickyHeaderItems]);

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
      id={columnKey(LEFT_SPACER_ID)}
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
        dataAttributes={rowDataAttributes?.(item)}
        hasLeadingCell
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
      rowDataAttributes,
      rowDependencies,
      dataTableColumns,
    ],
  );

  const renderColumns = (
    variant: 'stickyHeader' | 'dataTable',
    cols: PanelTableColumn[],
  ) => {
    const lastFlexibleIndex = cols.findLastIndex(isFlexible);
    return cols.map((col, index) => {
      const synced = columnWidths.get(columnKey(col.id));
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
          id={columnKey(col.id)}
          isRowHeader={col.isRowHeader}
          allowsSorting={
            variant === 'stickyHeader' &&
            Boolean(onSortChange) &&
            col.allowsSorting
          }
          {...widthProps}
          allowsResizing={index < lastFlexibleIndex}
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
  };

  const dataTableSelectionWidth =
    selectionMode && selectionMode !== 'none' ? SELECTION_WIDTH : undefined;
  const layoutOptions = useMemo(
    () => ({ estimatedRowHeight, headingHeight: bodyHeadingHeight }),
    [bodyHeadingHeight, estimatedRowHeight],
  );
  const skeletonStyle = useMemo(() => {
    if (!isVirtualized) return undefined;
    const height = estimatedRowHeight;
    const barHeight = 12;
    const barY = Math.round((height - barHeight) / 2);
    const shapes: string[] = [];
    let x = SPACER_WIDTH;
    if (dataTableSelectionWidth) {
      shapes.push(
        `<rect x='${x + 10}' y='${Math.round((height - 16) / 2)}' width='16' height='16' rx='4'/>`,
      );
      x += dataTableSelectionWidth;
    }
    for (const col of columns) {
      const width = columnWidths.get(columnKey(col.id)) ?? col.width ?? 120;
      const bar = Math.min(width - 24, Math.round(width * 0.6));
      if (!col.hideLabel && bar >= 12) {
        shapes.push(
          `<rect x='${x + 8}' y='${barY}' width='${bar}' height='${barHeight}' rx='6'/>`,
        );
      }
      x += width;
    }
    const total = Math.ceil(x + SPACER_WIDTH);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${total}' height='${height}'><g fill='black'>${shapes.join('')}</g></svg>`;
    return {
      '--panel-table-skeleton': `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
      '--panel-table-skeleton-size': `${total}px ${height}px`,
    };
  }, [
    isVirtualized,
    estimatedRowHeight,
    dataTableSelectionWidth,
    columns,
    columnWidths,
  ]);
  const bodyHeadingStyle = {
    '--panel-table-body-heading-height': `${bodyHeadingHeight}px`,
    ...skeletonStyle,
  } as CSSProperties;

  const dataTable = (
    <AriaTable
      aria-label={ariaLabel}
      key={bodyKey}
      selectionMode={selectionMode}
      selectedKeys={selectedKeys}
      disabledKeys={disabledKeys}
      onSelectionChange={handleSelectionChange}
      onRowAction={onRowAction}
      treeColumn={treeColumn == null ? treeColumn : columnKey(treeColumn)}
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
        hasLoadingLeadingCell
      >
        {renderBodyRow}
      </TableBody>
    </AriaTable>
  );

  const body = isVirtualized ? (
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
            <ResizableTableContainer
              onResizeStart={handleResizeStart}
              onResizeEnd={handleResizeEnd}
            >
              <AriaTable
                aria-label={ariaLabel ? `${ariaLabel} columns` : undefined}
                selectionMode={selectionMode}
                selectedKeys={stickyHeaderSelectedKeys}
                onSelectionChange={handleSelectionChange}
                sortDescriptor={stickyHeaderSortDescriptor}
                onSortChange={handleSortChange}
                className={stickyHeaderTable()}
              >
                <TableHeader className={stickyHeaderInner()}>
                  {renderColumns('stickyHeader', columns)}
                </TableHeader>
                <AriaTableBody
                  {...tableBodyKeyProps}
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
      {isVirtualized ? (
        <ResizableTableContainer>
          <div
            ref={dataTableScrollRef}
            data-panel-table-body-scroll
            style={bodyHeadingStyle}
            className={dataTableScroll({
              className: bodyContainerClassName,
            })}
          >
            {caption && <div className={dataTableCaption()}>{caption}</div>}
            {body}
          </div>
        </ResizableTableContainer>
      ) : (
        <div
          ref={dataTableScrollRef}
          data-panel-table-body-scroll
          style={bodyHeadingStyle}
          className={dataTableScroll({ className: bodyContainerClassName })}
        >
          {caption && <div className={dataTableCaption()}>{caption}</div>}
          <ResizableTableContainer>{body}</ResizableTableContainer>
        </div>
      )}
    </>
  );
}
