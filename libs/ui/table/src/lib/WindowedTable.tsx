import {
  createContext,
  Fragment,
  memo,
  startTransition,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useId,
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
  ButtonContext,
  CollectionRendererContext,
  DEFAULT_SLOT,
  DefaultCollectionRenderer,
  Rect,
  setInteractionModality,
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

const IDLE_CELLS_PER_SIDE = 800;
const IDLE_CELLS_PER_STEP = 80;
const FAST_SCROLL_LEAD_ROWS = 6;
const FAST_SCROLL_NEW_CELLS_PER_FRAME = 240;
const MAX_IDLE_ROWS = 1000;
const MAX_IDLE_STEP = 20;
const SKIP_FAR_ROW_PAINT =
  typeof CSS !== 'undefined' && !CSS.supports('-moz-appearance', 'none');
const LIVE_MARGIN = 4;
const KEEP_LIVE_MARGIN = LIVE_MARGIN * 4;
const SETTLE_BATCH = 8;
const SETTLE_DELAY_MS = 30;
const LONG_PRESS_MS = 500;
const REPLAYED_SLOTS = '[slot=selection], [slot=chevron]';
const STATIC_ROW_IN_USE =
  '[data-static-row] [aria-expanded=true]:not([role=row])';
const NATIVE_CONTROLS =
  'a[href], button, input, select, textarea, label, summary, [tabindex]:not([tabindex="-1"]), [contenteditable]:not([contenteditable="false"]), [role=button], [role=link]';

type RootProps = ComponentProps<CollectionRenderer['CollectionRoot']>;
type BranchProps = ComponentProps<CollectionRenderer['CollectionBranch']>;
type CollectionNode = BranchProps['parent'];
type TableCollection = BranchProps['collection'] & {
  columns?: CollectionNode[];
  headerRows?: unknown[];
  rowHeaderColumnKeys?: ReadonlySet<Key>;
  expandedKeys?: ReadonlySet<Key>;
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
  treeIndex: number | null;
}

interface TreeRow {
  hasChildItems: boolean;
  isExpanded: boolean;
  posInSet: number;
  setSize: number;
}

function getTreeRow(
  collection: TableCollection,
  node: CollectionNode,
): TreeRow {
  const lastChild =
    node.lastChildKey == null ? null : collection.getItem(node.lastChildKey);
  const hasChildItems =
    Boolean(node.props?.hasChildItems) || lastChild?.type !== 'cell';
  const parent =
    node.parentKey == null ? null : collection.getItem(node.parentKey);
  const offset =
    parent?.type === 'item' ? (collection.columns?.length ?? 0) : 0;
  let lastSibling =
    parent?.lastChildKey == null
      ? null
      : collection.getItem(parent.lastChildKey);
  while (
    lastSibling &&
    lastSibling.type !== 'item' &&
    lastSibling.prevKey != null
  ) {
    lastSibling = collection.getItem(lastSibling.prevKey);
  }
  return {
    hasChildItems,
    isExpanded:
      hasChildItems && Boolean(collection.expandedKeys?.has(node.key)),
    posInSet: node.index - offset + 1,
    setSize: (lastSibling?.index ?? node.index) - offset + 1,
  };
}

function getRenderWindowOptions(cellsPerRow: number): RenderWindowOptions {
  const cells = Math.max(1, cellsPerRow);
  const idleRows = Math.min(
    MAX_IDLE_ROWS,
    Math.floor(IDLE_CELLS_PER_SIDE / cells),
  );
  return {
    overscan: 12,
    scrollAhead: 40,
    idleRowsAbove: idleRows,
    idleRowsBelow: idleRows,
    step: 5,
    maxGrowth: 10,
    idleStep: Math.min(
      MAX_IDLE_STEP,
      Math.max(1, Math.floor(IDLE_CELLS_PER_STEP / cells)),
    ),
  };
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

function getStaticRowsInUse(container: Element, rows: readonly { key: Key }[]) {
  const keys = new Set<Key>();
  const active = document.activeElement;
  const elements = [
    ...container.querySelectorAll(STATIC_ROW_IN_USE),
    ...(active && container.contains(active) ? [active] : []),
  ];
  for (const element of elements) {
    const index =
      element.closest<HTMLElement>('[data-static-row]')?.dataset.index;
    const key = index ? rows[Number(index)]?.key : undefined;
    if (key != null) keys.add(key);
  }
  return keys;
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

const StaticSelectionCheckbox = memo(function StaticSelectionCheckbox({
  id,
  labelledBy,
  isSelected,
  isDisabled,
}: {
  id: string;
  labelledBy: string | undefined;
  isSelected: boolean;
  isDisabled: boolean;
}) {
  return (
    <Checkbox
      slot="selection"
      id={id}
      aria-label="Select"
      aria-labelledby={labelledBy}
      isSelected={isSelected}
      isDisabled={isDisabled}
      excludeFromTabOrder
    />
  );
});

const StaticCell = memo(function StaticCell({
  cell,
  width,
  id,
  isRowHeader,
  level,
  isExpanded,
  hasChildItems,
  isTreeColumn,
  values,
  children,
}: PropsWithChildren<{
  cell: TableCellNode;
  width: number;
  id: string;
  isRowHeader: boolean;
  level: number;
  isExpanded: boolean;
  hasChildItems: boolean;
  isTreeColumn: boolean;
  values: Record<string, unknown> | undefined;
}>) {
  const start = cell.colIndex ?? cell.index;
  const content = cell.props?.children;
  return (
    <div
      role="presentation"
      data-panel-table-cell=""
      style={{ flex: 'none', width }}
    >
      <div
        id={isRowHeader ? id : undefined}
        role={isRowHeader ? 'rowheader' : 'gridcell'}
        className={resolveClassName(
          cell.props?.className,
          values ?? {},
          'react-aria-Cell',
        )}
        data-rac=""
        aria-colindex={start + 1}
        data-column-index={start}
        data-expanded={isExpanded || undefined}
        data-has-child-items={hasChildItems || undefined}
        data-level={level}
        data-tree-column={isTreeColumn || undefined}
      >
        {children ??
          (typeof content === 'function' ? content(values) : content)}
      </div>
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
  hasChildItems,
  isExpanded,
  posInSet,
  setSize,
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
  hasChildItems: boolean;
  isExpanded: boolean;
  posInSet: number;
  setSize: number;
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
  const isTree = columns.treeIndex != null;
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
    hasChildItems,
    isExpanded,
  };
  const selectionCellKey = internalCellKey(node.key, 'selection');
  const columnKeyAt = (index: number) => columns.keys[index];
  const id = useId();
  const rowHeaderIds =
    cells
      .filter((cell) => columns.rowHeaders.has(cell.colIndex ?? cell.index))
      .map((cell) => `${id}-${cell.colIndex ?? cell.index}`)
      .join(' ') || undefined;
  const labelledBy = (ownId: string) =>
    rowHeaderIds ? `${ownId} ${rowHeaderIds}` : undefined;
  const chevronLabelledBy = labelledBy(`${id}-chevron`);
  const buttonSlots = useMemo(
    () => ({
      slots: {
        [DEFAULT_SLOT]: {},
        chevron: {
          id: `${id}-chevron`,
          isDisabled,
          excludeFromTabOrder: true,
          preventFocusOnPress: true,
          'aria-label': isExpanded ? 'Collapse' : 'Expand',
          'aria-labelledby': chevronLabelledBy,
        },
        drag: {},
      },
    }),
    [id, isDisabled, isExpanded, chevronLabelledBy],
  );
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
        aria-labelledby={rowHeaderIds}
        aria-rowindex={isTree ? undefined : index + 1 + columns.headerRowCount}
        aria-level={isTree ? level : undefined}
        aria-expanded={isTree && hasChildItems ? isExpanded : undefined}
        aria-posinset={isTree ? posInSet : undefined}
        aria-setsize={isTree ? setSize : undefined}
        aria-selected={hasSelection ? isSelected : undefined}
        aria-disabled={isDisabled || undefined}
        data-selected={isSelected || undefined}
        data-disabled={isDisabled || undefined}
        data-selection-mode={hasSelection ? selectionMode : undefined}
        data-expanded={isExpanded || undefined}
        data-has-child-items={hasChildItems || undefined}
        data-level={level}
      >
        <CollectionRendererContext.Provider value={DefaultCollectionRenderer}>
          <ButtonContext.Provider value={buttonSlots}>
            {cells.map((cell) => {
              const start = cell.colIndex ?? cell.index;
              const isTreeColumn = cell.index === columns.treeIndex;
              const needsValues =
                typeof cell.props?.className === 'function' ||
                typeof cell.props?.children === 'function';
              return (
                <StaticCell
                  key={cell.key}
                  cell={cell}
                  width={cellWidth(cell, columnKeyAt, columnWidths)}
                  id={`${id}-${start}`}
                  isRowHeader={columns.rowHeaders.has(start)}
                  level={level}
                  isExpanded={isExpanded}
                  hasChildItems={hasChildItems}
                  isTreeColumn={isTreeColumn}
                  values={
                    needsValues
                      ? { ...values, columnIndex: start, isTreeColumn }
                      : undefined
                  }
                >
                  {cell.key === selectionCellKey ? (
                    <StaticSelectionCheckbox
                      id={`${id}-selection`}
                      labelledBy={labelledBy(`${id}-selection`)}
                      isSelected={isSelected}
                      isDisabled={isSelectionDisabled}
                    />
                  ) : undefined}
                </StaticCell>
              );
            })}
          </ButtonContext.Provider>
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
  const treeColumn = liveState?.treeColumn ?? null;
  const columnsSignature = getColumnsSignature(collection as TableCollection);
  const staticColumns = useMemo<StaticColumns>(() => {
    const [headerRowCount, columns] = JSON.parse(columnsSignature) as [
      number,
      [Key, number][],
    ];
    const keys = columns.map(([key]) => key);
    const treeIndex = treeColumn == null ? -1 : keys.indexOf(treeColumn);
    return {
      headerRowCount,
      keys,
      rowHeaders: new Set(
        columns.flatMap(([, isRowHeader], index) =>
          isRowHeader ? [index] : [],
        ),
      ),
      treeIndex: treeIndex < 0 ? null : treeIndex,
    };
  }, [columnsSignature, treeColumn]);
  const indexByKey = useMemo(
    () => new Map(rows.map((row, index) => [row.key, index])),
    [rows],
  );
  const sizerRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef(rows);
  const selectionManagerRef = useRef(liveState?.selectionManager);
  const pressedPointersRef = useRef<Set<number>>(new Set());
  const [sizerCallbackRef, scrollMargin] = useWindowScrollMargin(sizerRef);
  const cellsPerRow = staticColumns.keys.length;
  const renderWindowOptions = useMemo(
    () => getRenderWindowOptions(cellsPerRow),
    [cellsPerRow],
  );
  const renderWindow = useRenderWindow(renderWindowOptions);
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
  const {
    rangeExtractor: windowRangeExtractor,
    follow,
    windowRef,
  } = renderWindow;
  const [catchUp, setCatchUp] = useState(0);
  const isCatchUpScheduledRef = useRef(false);
  const rangeExtractor = useCallback(
    (range: Range) => {
      let indexes: number[];
      const current = windowRef.current;
      if (
        catchUp >= 0 &&
        current &&
        current.end < range.count &&
        isScrollingFast()
      ) {
        if (!isCatchUpScheduledRef.current) {
          isCatchUpScheduledRef.current = true;
          afterFastScroll(() => {
            isCatchUpScheduledRef.current = false;
            setCatchUp((value) => value + 1);
          });
        }
        indexes = follow(
          range,
          FAST_SCROLL_LEAD_ROWS,
          Math.floor(
            FAST_SCROLL_NEW_CELLS_PER_FRAME / Math.max(1, cellsPerRow),
          ),
        );
      } else {
        indexes = windowRangeExtractor(range);
      }
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
      return result;
    },
    [
      windowRangeExtractor,
      follow,
      windowRef,
      persistedIndexes,
      catchUp,
      cellsPerRow,
    ],
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
    selectionManagerRef.current = liveState?.selectionManager;
  });

  const visibleRange = virtualizer.calculateRange();
  const visibleStart = visibleRange?.startIndex ?? 0;
  const visibleEnd = visibleRange?.endIndex ?? -1;
  const [liveKeys, setLiveKeys] = useState<ReadonlySet<Key>>(() => {
    const initialRows =
      typeof window === 'undefined'
        ? 0
        : Math.ceil(window.innerHeight / estimatedRowHeight) + LIVE_MARGIN;
    return new Set(rows.slice(0, initialRows).map((row) => row.key));
  });
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
    let promoted: Key[] = [];
    let delay = SETTLE_DELAY_MS;
    if (missing.length) {
      missing.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));
      const batch = missing.slice(0, SETTLE_BATCH);
      promoted = batch.flatMap((index) => rows[index]?.key ?? []);
      update = addKeys(promoted);
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
    let timeout: ReturnType<typeof setTimeout>;
    const apply = () => {
      const container = sizerRef.current?.parentElement;
      if (pressedPointersRef.current.size) {
        timeout = setTimeout(apply, SETTLE_DELAY_MS);
        return;
      }
      startTransition(() =>
        setLiveKeys((current) => {
          const inUse =
            container && promoted.length
              ? getStaticRowsInUse(container, rowsRef.current)
              : null;
          return inUse?.size
            ? addKeys(promoted.filter((key) => !inUse.has(key)))(current)
            : next(current);
        }),
      );
    };
    timeout = setTimeout(apply, delay);
    return () => clearTimeout(timeout);
  }, [isScrolling, visibleStart, visibleEnd, liveKeys, rows, indexByKey]);

  useEffect(() => {
    const container = sizerRef.current?.parentElement;
    if (!container) return;
    const getStaticRow = (target: EventTarget | null) => {
      const element =
        target instanceof Element
          ? target.closest<HTMLElement>('[data-static-row]')
          : null;
      const key = element
        ? rowsRef.current[Number(element.dataset.index)]?.key
        : undefined;
      return element && key != null
        ? { index: element.dataset.index, key }
        : null;
    };
    const promote = (event: PointerEvent) => {
      if (
        event.pointerType !== 'mouse' ||
        event.buttons !== 0 ||
        (event.movementX === 0 && event.movementY === 0)
      ) {
        return;
      }
      const row = getStaticRow(event.target);
      if (row) flushSync(() => setLiveKeys(addKeys([row.key])));
    };
    const getStaticTarget = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      const rowElement = target?.closest('[role=row]') ?? null;
      const row = getStaticRow(rowElement);
      if (!row || !target || !rowElement) return null;
      const inRow = (element: Element | null) =>
        element && rowElement.contains(element) ? element : null;
      const slot = inRow(target.closest(REPLAYED_SLOTS))?.getAttribute('slot');
      if (!slot && inRow(target.closest(NATIVE_CONTROLS))) return null;
      return {
        row,
        slot,
        columnIndex: inRow(target.closest('[aria-colindex]'))?.getAttribute(
          'aria-colindex',
        ),
      };
    };
    const pressed = pressedPointersRef.current;
    let longPress: {
      key: Key;
      timer: ReturnType<typeof setTimeout> | null;
    } | null = null;
    const endLongPress = () => {
      if (longPress?.timer) clearTimeout(longPress.timer);
      longPress = null;
    };
    const press = (event: PointerEvent) => {
      pressed.add(event.pointerId);
      endLongPress();
      const hit = event.pointerType === 'touch' ? getStaticTarget(event) : null;
      if (!hit || hit.slot === 'chevron') return;
      const { key } = hit.row;
      const timer = setTimeout(() => {
        const manager = selectionManagerRef.current;
        if (longPress?.timer !== timer) return;
        if (!manager?.canSelectItem(key)) {
          longPress = null;
          return;
        }
        longPress.timer = null;
        manager.setSelectionBehavior('toggle');
        manager.select(key, event);
      }, LONG_PRESS_MS);
      longPress = { key, timer };
    };
    const release = (event: PointerEvent) => {
      pressed.delete(event.pointerId);
      if (longPress?.timer) endLongPress();
    };
    const releaseAll = () => {
      pressed.clear();
      endLongPress();
    };
    const blockContextMenu = (event: Event) => {
      if (longPress) event.preventDefault();
    };
    const replayClick = (event: MouseEvent) => {
      const hit = getStaticTarget(event);
      if (!hit) return;
      const { row, slot, columnIndex } = hit;
      if (longPress?.key === row.key && !longPress.timer) {
        longPress = null;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const isPointerClick =
        event.detail > 0 &&
        event.buttons === 0 &&
        (event as PointerEvent).pointerType !== '';
      flushSync(() => setLiveKeys(addKeys([row.key])));
      const liveRow = container.querySelector<HTMLElement>(
        `[data-index="${row.index}"]:not([data-static-row]) [role=row]`,
      );
      const slotted = slot
        ? liveRow?.querySelector<HTMLElement>(`[slot="${slot}"]`)
        : null;
      const input = slotted?.querySelector('input');
      const replayTarget = slot ? (input ?? slotted) : liveRow;
      if (!replayTarget) return;
      event.preventDefault();
      event.stopPropagation();
      const cell = columnIndex
        ? liveRow?.querySelector<HTMLElement>(
            `[aria-colindex="${columnIndex}"]`,
          )
        : null;
      const focusTarget = slot ? input : (cell ?? liveRow);
      if (isPointerClick) focusTarget?.focus({ preventScroll: true });
      replayTarget.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: event.view,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        }),
      );
      if (isPointerClick) setInteractionModality('pointer');
    };
    container.addEventListener('pointermove', promote);
    container.addEventListener('pointerdown', press, true);
    container.addEventListener('contextmenu', blockContextMenu);
    container.addEventListener('click', replayClick, true);
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', release, true);
    window.addEventListener('blur', releaseAll);
    return () => {
      container.removeEventListener('pointermove', promote);
      container.removeEventListener('pointerdown', press, true);
      container.removeEventListener('contextmenu', blockContextMenu);
      container.removeEventListener('click', replayClick, true);
      window.removeEventListener('pointerup', release, true);
      window.removeEventListener('pointercancel', release, true);
      window.removeEventListener('blur', releaseAll);
      releaseAll();
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
    const tree = getTreeRow(collection as TableCollection, row);
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
        hasChildItems={tree.hasChildItems}
        isExpanded={tree.isExpanded}
        posInSet={tree.posInSet}
        setSize={tree.setSize}
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
