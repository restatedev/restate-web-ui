import {
  createContext,
  Fragment,
  memo,
  startTransition,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ContextType,
  type CSSProperties,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import {
  CollectionRendererContext,
  DefaultCollectionRenderer,
  Rect,
  Size,
  TableStateContext,
  type CollectionRenderer,
  type Key,
} from 'react-aria-components';
import { flushSync } from 'react-dom';
import type { Range } from '@tanstack/react-virtual';
import { Checkbox } from '@restate/ui-form-field';
import {
  useGrowRenderWindowWhenIdle,
  useQuietWindowVirtualizer,
  useRenderWindow,
  useWindowScrollMargin,
  type RenderWindowOptions,
} from '@restate/util-render-window';
import { afterFastScroll, isScrollingFast } from './scrollSpeed';
import { internalCellKey } from './keys';
import { WindowedCellsContext } from './window/WindowedCellsContext';

const TABLE_RENDER_WINDOW: RenderWindowOptions = {
  overscan: 12,
  scrollAhead: 40,
  idleRowsAbove: 1000,
  idleRowsBelow: 1000,
  step: 5,
  maxGrowth: 10,
  idleStep: 20,
};
const SKIP_FAR_ROW_PAINT =
  typeof CSS !== 'undefined' && !CSS.supports('-moz-appearance', 'none');
const LIVE_MARGIN = 4;
const KEEP_LIVE_MARGIN = LIVE_MARGIN * 4;
const SETTLE_BATCH = 8;
const SETTLE_DELAY_MS = 30;

type RootProps = ComponentProps<CollectionRenderer['CollectionRoot']>;
type BranchProps = ComponentProps<CollectionRenderer['CollectionBranch']>;
type CollectionNode = BranchProps['parent'];
type TableCollection = BranchProps['collection'] & {
  columns?: CollectionNode[];
  headerRows?: unknown[];
  rowHeaderColumnKeys?: ReadonlySet<Key>;
};
type TableCellNode = CollectionNode & {
  colIndex?: number | null;
  colSpan?: number | null;
};
type TableStateValue = NonNullable<ContextType<typeof TableStateContext>>;

interface WindowedTableOptions {
  columnWidths: ReadonlyMap<Key, number>;
  totalWidth: number;
  estimatedRowHeight: number;
  headingHeight: number;
}

const WindowedTableContext = createContext<WindowedTableOptions>({
  columnWidths: new Map(),
  totalWidth: 0,
  estimatedRowHeight: 43,
  headingHeight: 0,
});

const PersistedKeysContext = createContext<RootProps['persistedKeys']>(null);

type LayoutDelegate = NonNullable<CollectionRenderer['layoutDelegate']>;

interface LayoutState {
  virtualizer: {
    measurementsCache: { start: number; size: number }[];
    getTotalSize(): number;
  };
  scrollMargin: number;
  indexByKey: ReadonlyMap<Key, number>;
  collection: BranchProps['collection'];
  totalWidth: number;
}

type LayoutStateRef = { current: LayoutState | null };

const LayoutStateContext = createContext<LayoutStateRef>({ current: null });

function createLayoutDelegate(stateRef: LayoutStateRef): LayoutDelegate {
  const rowIndex = (state: LayoutState, key: Key) => {
    const index = state.indexByKey.get(key);
    if (index !== undefined) return index;
    const parentKey = state.collection.getItem(key)?.parentKey;
    return parentKey == null ? undefined : state.indexByKey.get(parentKey);
  };
  return {
    getItemRect(key) {
      const state = stateRef.current;
      if (!state) return null;
      const index = rowIndex(state, key);
      const item =
        index === undefined
          ? undefined
          : state.virtualizer.measurementsCache[index];
      if (!item) return null;
      return new Rect(
        0,
        item.start - state.scrollMargin,
        state.totalWidth,
        item.size,
      );
    },
    getVisibleRect() {
      const scrollMargin = stateRef.current?.scrollMargin ?? 0;
      const top = window.scrollY - scrollMargin;
      return new Rect(
        window.scrollX,
        Math.max(0, top),
        window.innerWidth,
        Math.max(0, window.innerHeight + Math.min(0, top)),
      );
    },
    getContentSize() {
      const state = stateRef.current;
      return new Size(
        state?.totalWidth ?? 0,
        state?.virtualizer.getTotalSize() ?? 0,
      );
    },
  };
}

const renderedNodes = new WeakMap<object, ReactNode>();

function renderNode(node: CollectionNode): ReactNode {
  if (renderedNodes.has(node)) return renderedNodes.get(node);
  const rendered = node.render?.(node) ?? null;
  renderedNodes.set(node, rendered);
  return rendered;
}

function getRowKey(collection: BranchProps['collection'], key: Key) {
  const node = collection.getItem(key);
  return node?.type === 'cell' ? (node.parentKey ?? null) : key;
}

function getFocusedRowKey(state: TableStateValue | null) {
  const key = state?.selectionManager.focusedKey;
  if (state == null || key == null) return null;
  return getRowKey(state.collection, key);
}

interface StaticColumns {
  headerRowCount: number;
  keys: Key[];
  rowHeaders: ReadonlySet<number>;
}

function getColumnsSignature(collection: TableCollection) {
  return JSON.stringify([
    collection.headerRows?.length ?? 1,
    (collection.columns ?? []).map((column) => [
      column.key,
      collection.rowHeaderColumnKeys?.has(column.key) ||
      column.props?.isRowHeader
        ? 1
        : 0,
    ]),
  ]);
}

const staticCells = new WeakMap<
  object,
  { collection: object; cells: TableCellNode[] }
>();

function getStaticCells(collection: TableCollection, row: CollectionNode) {
  const cached = staticCells.get(row);
  if (cached?.collection === collection) return cached.cells;
  const cells = Array.from(collection.getChildren?.(row.key) ?? []).filter(
    (node) => node.type === 'cell',
  );
  const isSame =
    cached?.cells.length === cells.length &&
    cells.every((cell, index) => cell === cached.cells[index]);
  const entry = { collection, cells: isSame ? cached.cells : cells };
  staticCells.set(row, entry);
  return entry.cells;
}

function addKeys(keys: Key[]) {
  return (current: ReadonlySet<Key>) => {
    let next: Set<Key> | null = null;
    for (const key of keys) {
      if (current.has(key)) continue;
      next ??= new Set(current);
      next.add(key);
    }
    return next ?? current;
  };
}

function deleteKeys(keys: Key[]) {
  return (current: ReadonlySet<Key>) => {
    let next: Set<Key> | null = null;
    for (const key of keys) {
      if (!current.has(key)) continue;
      next ??= new Set(current);
      next.delete(key);
    }
    return next ?? current;
  };
}

function getDataAttributes(props: Record<string, unknown> | undefined) {
  const attributes: Record<string, unknown> = {};
  for (const name in props) {
    if (name.startsWith('data-')) attributes[name] = props[name];
  }
  return attributes;
}

function resolveClassName(
  className: unknown,
  values: Record<string, unknown>,
  defaultClassName: string,
) {
  if (typeof className === 'function') {
    return className({ ...values, defaultClassName });
  }
  return typeof className === 'string' ? className : defaultClassName;
}

function rowWrapperStyle(offset: number): CSSProperties {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    transform: `translateY(${offset}px)`,
  };
}

function cellWidth(
  cell: TableCellNode,
  columnKeyAt: (index: number) => Key | undefined,
  columnWidths: ReadonlyMap<Key, number>,
) {
  const start = cell.colIndex ?? cell.index;
  const span = cell.colSpan ?? 1;
  let width = 0;
  for (let index = start; index < start + span; index++) {
    const key = columnKeyAt(index);
    if (key != null) width += columnWidths.get(key) ?? 0;
  }
  return width;
}

function WindowedCollectionRoot({ collection, persistedKeys }: RootProps) {
  const { totalWidth, headingHeight } = useContext(WindowedTableContext);
  return (
    <div
      role="presentation"
      style={{ position: 'relative', width: totalWidth || undefined }}
    >
      <PersistedKeysContext.Provider value={persistedKeys}>
        {Array.from(collection, (node) =>
          node.type === 'tablebody' ? (
            <Fragment key={node.key}>{renderNode(node)}</Fragment>
          ) : (
            <div
              key={node.key}
              role="presentation"
              style={{ height: headingHeight, overflow: 'hidden' }}
            >
              {renderNode(node)}
            </div>
          ),
        )}
      </PersistedKeysContext.Provider>
    </div>
  );
}

function RowCells({
  collection,
  parent,
}: Pick<BranchProps, 'collection' | 'parent'>) {
  const { columnWidths } = useContext(WindowedTableContext);
  const columns = (collection as TableCollection).columns;
  const columnKeyAt = (index: number) => columns?.[index]?.key;
  return Array.from(collection.getChildren?.(parent.key) ?? [], (cell) => (
    <div
      key={cell.key}
      role="presentation"
      data-panel-table-cell=""
      style={{
        flex: 'none',
        width: cellWidth(cell, columnKeyAt, columnWidths),
      }}
    >
      {renderNode(cell)}
    </div>
  ));
}

const WindowedRow = memo(function WindowedRow({
  node,
  index,
  offset,
  isBeforeSelected,
  measureElement,
}: {
  node: CollectionNode;
  index: number;
  offset: number;
  isBeforeSelected: boolean;
  measureElement: (element: Element | null) => void;
}) {
  return (
    <div
      role="presentation"
      data-index={index}
      data-before-selected={isBeforeSelected || undefined}
      ref={measureElement}
      style={rowWrapperStyle(offset)}
    >
      {renderNode(node)}
    </div>
  );
});

const StaticRow = memo(function StaticRow({
  node,
  cells,
  columns,
  index,
  offset,
  isBeforeSelected,
  isSelected,
  isSelectionDisabled,
  isDisabled,
  selectionMode,
  measureElement,
}: {
  node: CollectionNode;
  cells: TableCellNode[];
  columns: StaticColumns;
  index: number;
  offset: number;
  isBeforeSelected: boolean;
  isSelected: boolean;
  isSelectionDisabled: boolean;
  isDisabled: boolean;
  selectionMode: string;
  measureElement: (element: Element | null) => void;
}) {
  const { columnWidths, estimatedRowHeight } = useContext(WindowedTableContext);
  const wrapperRef = useCallback(
    (element: HTMLDivElement | null) => {
      measureElement(element);
      if (element && SKIP_FAR_ROW_PAINT) {
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            element.style.setProperty('content-visibility', 'auto'),
          ),
        );
      }
    },
    [measureElement],
  );
  const level = (node.level ?? 0) + 1;
  const hasSelection = selectionMode !== 'none';
  const values = {
    isSelected,
    isDisabled,
    isFocused: false,
    isFocusVisible: false,
    isFocusVisibleWithin: false,
    isHovered: false,
    isPressed: false,
    isDragging: false,
    isDropTarget: false,
    selectionMode,
    id: node.key,
    level,
  };
  const selectionCellKey = internalCellKey(node.key, 'selection');
  const columnKeyAt = (index: number) => columns.keys[index];
  return (
    <div
      role="presentation"
      data-index={index}
      data-static-row=""
      data-before-selected={isBeforeSelected || undefined}
      ref={wrapperRef}
      style={
        SKIP_FAR_ROW_PAINT
          ? {
              ...rowWrapperStyle(offset),
              containIntrinsicSize: `auto ${estimatedRowHeight}px`,
            }
          : rowWrapperStyle(offset)
      }
    >
      <div
        {...getDataAttributes(node.props)}
        role="row"
        className={resolveClassName(
          node.props?.className,
          values,
          'react-aria-Row',
        )}
        style={
          {
            '--table-row-level': level,
            ...node.props?.style,
          } as CSSProperties
        }
        data-rac=""
        aria-rowindex={index + 1 + columns.headerRowCount}
        aria-selected={hasSelection ? isSelected : undefined}
        data-selected={isSelected || undefined}
        data-disabled={isDisabled || undefined}
        data-selection-mode={hasSelection ? selectionMode : undefined}
        data-level={level}
      >
        <CollectionRendererContext.Provider value={DefaultCollectionRenderer}>
          {cells.map((cell) => {
            const start = cell.colIndex ?? cell.index;
            const width = cellWidth(cell, columnKeyAt, columnWidths);
            const children = cell.props?.children;
            return (
              <div
                key={cell.key}
                role="presentation"
                data-panel-table-cell=""
                style={{ flex: 'none', width }}
              >
                <div
                  role={
                    columns.rowHeaders.has(start) ? 'rowheader' : 'gridcell'
                  }
                  className={resolveClassName(
                    cell.props?.className,
                    { ...values, columnIndex: start },
                    'react-aria-Cell',
                  )}
                  data-rac=""
                  aria-colindex={start + 1}
                  data-column-index={start}
                  data-level={level}
                >
                  {cell.key === selectionCellKey ? (
                    <Checkbox
                      slot="selection"
                      aria-label="Select"
                      isSelected={isSelected}
                      isDisabled={isSelectionDisabled}
                      isReadOnly
                    />
                  ) : typeof children === 'function' ? (
                    children({ ...values, columnIndex: start })
                  ) : (
                    children
                  )}
                </div>
              </div>
            );
          })}
        </CollectionRendererContext.Provider>
      </div>
    </div>
  );
});

function WindowedRows({
  collection,
  parent,
}: Pick<BranchProps, 'collection' | 'parent'>) {
  const { estimatedRowHeight, totalWidth } = useContext(WindowedTableContext);
  const persistedKeys = useContext(PersistedKeysContext);
  const layoutStateRef = useContext(LayoutStateContext);
  const [rowsSnapshot, setRowsSnapshot] = useState(() => ({
    collection,
    parent,
    rows: Array.from(collection.getChildren?.(parent.key) ?? []),
  }));
  let snapshot = rowsSnapshot;
  if (snapshot.collection !== collection || snapshot.parent !== parent) {
    const nextRows = Array.from(collection.getChildren?.(parent.key) ?? []);
    const isSame =
      nextRows.length === snapshot.rows.length &&
      nextRows.every((row, index) => row === snapshot.rows[index]);
    snapshot = { collection, parent, rows: isSame ? snapshot.rows : nextRows };
    setRowsSnapshot(snapshot);
  }
  const rows = snapshot.rows;
  const liveState = useContext(TableStateContext);
  const staticState = useDeferredValue(liveState);
  const staticManager = staticState?.selectionManager;
  const focusedRowKey = getFocusedRowKey(liveState);
  const columnsSignature = getColumnsSignature(collection as TableCollection);
  const staticColumns = useMemo<StaticColumns>(() => {
    const [headerRowCount, columns] = JSON.parse(columnsSignature) as [
      number,
      [Key, number][],
    ];
    return {
      headerRowCount,
      keys: columns.map(([key]) => key),
      rowHeaders: new Set(
        columns.flatMap(([, isRowHeader], index) =>
          isRowHeader ? [index] : [],
        ),
      ),
    };
  }, [columnsSignature]);
  const indexByKey = useMemo(
    () => new Map(rows.map((row, index) => [row.key, index])),
    [rows],
  );
  const sizerRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef(rows);
  const [sizerCallbackRef, scrollMargin] = useWindowScrollMargin(sizerRef);
  const renderWindow = useRenderWindow(TABLE_RENDER_WINDOW);
  const persistedIndexes = useMemo(() => {
    if (!persistedKeys?.size) return [];
    const indexes = new Set<number>();
    for (const key of persistedKeys) {
      const rowKey = getRowKey(collection, key);
      const index = rowKey == null ? undefined : indexByKey.get(rowKey);
      if (index !== undefined) indexes.add(index);
    }
    return Array.from(indexes).sort((a, b) => a - b);
  }, [persistedKeys, collection, indexByKey]);
  const mergedRef = useRef<{
    base: number[];
    persisted: number[];
    result: number[];
  } | null>(null);
  const windowRangeExtractor = renderWindow.rangeExtractor;
  const [catchUp, setCatchUp] = useState(0);
  const renderedIndexesRef = useRef<number[] | null>(null);
  const isCatchUpScheduledRef = useRef(false);
  const count = rows.length;
  const rangeExtractor = useCallback(
    (range: Range) => {
      const rendered = renderedIndexesRef.current;
      if (
        catchUp >= 0 &&
        rendered &&
        (rendered.at(-1) ?? -1) < count &&
        isScrollingFast()
      ) {
        if (!isCatchUpScheduledRef.current) {
          isCatchUpScheduledRef.current = true;
          afterFastScroll(() => {
            isCatchUpScheduledRef.current = false;
            setCatchUp((value) => value + 1);
          });
        }
        return rendered;
      }
      const indexes = windowRangeExtractor(range);
      let result = indexes;
      if (persistedIndexes.length) {
        const merged = mergedRef.current;
        if (
          merged &&
          merged.base === indexes &&
          merged.persisted === persistedIndexes
        ) {
          result = merged.result;
        } else {
          const first = indexes[0] ?? 0;
          const last = indexes.at(-1) ?? -1;
          const outside = persistedIndexes.filter(
            (index) => index < first || index > last,
          );
          result = outside.length
            ? [...indexes, ...outside].sort((a, b) => a - b)
            : indexes;
          mergedRef.current = {
            base: indexes,
            persisted: persistedIndexes,
            result,
          };
        }
      }
      renderedIndexesRef.current = result;
      return result;
    },
    [windowRangeExtractor, persistedIndexes, count, catchUp],
  );
  const getItemKey = useCallback(
    (index: number) => rows[index]?.key ?? index,
    [rows],
  );
  const estimateSize = useCallback(
    () => estimatedRowHeight,
    [estimatedRowHeight],
  );
  const virtualizer = useQuietWindowVirtualizer({
    count: rows.length,
    estimateSize,
    scrollMargin,
    getItemKey,
    rangeExtractor,
  });
  renderWindow.scrollStateRef.current = virtualizer;
  useGrowRenderWindowWhenIdle(
    renderWindow,
    virtualizer.isScrolling,
    rows.length,
    false,
  );
  useLayoutEffect(() => {
    layoutStateRef.current = {
      virtualizer,
      scrollMargin,
      indexByKey,
      collection,
      totalWidth,
    };
    rowsRef.current = rows;
  });

  const visibleRange = virtualizer.calculateRange();
  const visibleStart = visibleRange?.startIndex ?? 0;
  const visibleEnd = visibleRange?.endIndex ?? -1;
  const [liveKeys, setLiveKeys] = useState<ReadonlySet<Key>>(() => new Set());
  const isScrolling = virtualizer.isScrolling;
  useEffect(() => {
    if (isScrolling || visibleEnd < visibleStart) return;
    const first = Math.max(0, visibleStart - LIVE_MARGIN);
    const last = Math.min(rows.length - 1, visibleEnd + LIVE_MARGIN);
    const center = (visibleStart + visibleEnd) / 2;
    const missing: number[] = [];
    for (let index = first; index <= last; index++) {
      const key = rows[index]?.key;
      if (key != null && !liveKeys.has(key)) missing.push(index);
    }
    let update: ((current: ReadonlySet<Key>) => ReadonlySet<Key>) | null = null;
    let delay = SETTLE_DELAY_MS;
    if (missing.length) {
      missing.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));
      const batch = missing.slice(0, SETTLE_BATCH);
      update = addKeys(batch.flatMap((index) => rows[index]?.key ?? []));
      if (batch.some((index) => index >= visibleStart && index <= visibleEnd)) {
        delay = 0;
      }
    } else {
      const stale: Key[] = [];
      for (const key of liveKeys) {
        const index = indexByKey.get(key);
        if (
          index === undefined ||
          index < visibleStart - KEEP_LIVE_MARGIN ||
          index > visibleEnd + KEEP_LIVE_MARGIN
        ) {
          stale.push(key);
        }
        if (stale.length >= SETTLE_BATCH) break;
      }
      if (stale.length) {
        update = deleteKeys(stale);
        delay = SETTLE_DELAY_MS * 2;
      }
    }
    if (!update) return;
    const next = update;
    const timeout = setTimeout(
      () => startTransition(() => setLiveKeys(next)),
      delay,
    );
    return () => clearTimeout(timeout);
  }, [isScrolling, visibleStart, visibleEnd, liveKeys, rows, indexByKey]);

  useEffect(() => {
    const container = sizerRef.current?.parentElement;
    if (!container) return;
    const promote = (event: PointerEvent) => {
      if (
        event.type === 'pointermove'
          ? event.pointerType !== 'mouse' ||
            (event.movementX === 0 && event.movementY === 0)
          : event.pointerType === 'mouse'
      ) {
        return;
      }
      const element =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-static-row]')
          : null;
      const key = element
        ? rowsRef.current[Number(element.dataset.index)]?.key
        : undefined;
      if (key == null) return;
      flushSync(() => setLiveKeys(addKeys([key])));
    };
    container.addEventListener('pointermove', promote);
    container.addEventListener('pointerover', promote);
    return () => {
      container.removeEventListener('pointermove', promote);
      container.removeEventListener('pointerover', promote);
    };
  }, []);

  const items = virtualizer.getVirtualItems();
  const renderedRows = items.map((item) => {
    const row = rows[item.index];
    if (!row) return null;
    const offset = item.start - scrollMargin;
    const isLive =
      liveKeys.has(row.key) ||
      row.key === focusedRowKey ||
      Boolean(persistedKeys?.has(row.key));
    const nextKey = rows[item.index + 1]?.key;
    if (isLive) {
      return (
        <WindowedRow
          key={row.key}
          node={row}
          index={item.index}
          offset={offset}
          isBeforeSelected={
            nextKey != null &&
            Boolean(liveState?.selectionManager.isSelected(nextKey))
          }
          measureElement={virtualizer.measureElement}
        />
      );
    }
    return (
      <StaticRow
        key={row.key}
        node={row}
        cells={getStaticCells(collection as TableCollection, row)}
        columns={staticColumns}
        index={item.index}
        offset={offset}
        isBeforeSelected={
          nextKey != null && Boolean(staticManager?.isSelected(nextKey))
        }
        isSelected={staticManager?.isSelected(row.key) ?? false}
        isSelectionDisabled={
          staticManager ? !staticManager.canSelectItem(row.key) : true
        }
        isDisabled={staticManager?.isDisabled(row.key) ?? false}
        selectionMode={staticManager?.selectionMode ?? 'none'}
        measureElement={virtualizer.measureElement}
      />
    );
  });

  return (
    <>
      <div
        ref={sizerCallbackRef}
        aria-hidden
        style={{ height: virtualizer.getTotalSize() }}
      />
      {renderedRows}
    </>
  );
}

function WindowedCollectionBranch(props: BranchProps) {
  if (props.parent.type === 'tablebody') {
    return <WindowedRows collection={props.collection} parent={props.parent} />;
  }
  if (props.parent.type === 'item') {
    return <RowCells collection={props.collection} parent={props.parent} />;
  }
  return <DefaultCollectionRenderer.CollectionBranch {...props} />;
}

export function WindowedTable({
  columnWidths,
  totalWidth,
  estimatedRowHeight,
  headingHeight,
  children,
}: PropsWithChildren<WindowedTableOptions>) {
  const layoutStateRef = useRef<LayoutState | null>(null);
  const renderer = useMemo<CollectionRenderer>(
    () => ({
      isVirtualized: true,
      layoutDelegate: createLayoutDelegate(layoutStateRef),
      CollectionRoot: WindowedCollectionRoot,
      CollectionBranch: WindowedCollectionBranch,
    }),
    [],
  );
  const options = useMemo(
    () => ({ columnWidths, totalWidth, estimatedRowHeight, headingHeight }),
    [columnWidths, totalWidth, estimatedRowHeight, headingHeight],
  );
  return (
    <CollectionRendererContext.Provider value={renderer}>
      <LayoutStateContext.Provider value={layoutStateRef}>
        <WindowedTableContext.Provider value={options}>
          <WindowedCellsContext.Provider value>
            {children}
          </WindowedCellsContext.Provider>
        </WindowedTableContext.Provider>
      </LayoutStateContext.Provider>
    </CollectionRendererContext.Provider>
  );
}
