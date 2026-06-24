import { useGetVirtualObjectState } from '@restate/data-access/admin-api-hooks';
import { Button } from '@restate/ui/button';
import { Cell, PanelTable, PanelTableColumn, Row } from '@restate/ui/table';
import { ErrorBanner } from '@restate/ui/error';
import { DropdownItem, DropdownSection } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { formatBytes, formatPlurals } from '@restate/util/intl';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopover,
} from '@restate/ui/popover';
import { DecodedValue, Value } from '@restate/features/invocation-route';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';
import {
  type RestateCodecOptions,
  StaticCodecOptionsProvider,
} from '@restate/features/codec';
import { SplitButton } from '@restate/ui/split-button';
import { useRestateContext } from '@restate/features/restate-context';
import { Portal } from '@restate/ui/portal';
import { Collection, type Key } from 'react-aria-components';
import { ComponentProps, Fragment, useId, useMemo, useState } from 'react';
import type { StateObjectRecord, StateTableColumnId } from './types';

const VISIBLE_STATE_KEYS = 5;
const COLLAPSED_STATE_PREVIEW_KEYS = 5;

type StateServiceType = 'virtual_object' | 'workflow' | 'service';

type StateChildRow =
  | {
      id: string;
      kind: 'state';
      name: string;
      value?: string;
      size: number;
    }
  | {
      id: string;
      kind: 'load_more';
      hiddenCount: number;
    };

function EditStateTrigger(props: ComponentProps<typeof Button>) {
  const { close } = usePopover();
  return (
    <Button
      {...props}
      onClick={(e) => {
        close?.();
        props?.onClick?.(e);
      }}
    />
  );
}

const stateObjectStyles = tv({
  slots: {
    objectKeyCell: '[&&&]:overflow-visible',
    objectKey: 'flex min-w-0 items-center gap-2',
    chevron:
      'h-5 w-5 shrink-0 rounded-md p-0.5 text-gray-400 group-data-[expanded=true]/row:rotate-90',
    objectIcon:
      'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-500',
    stateKeyCell: 'bg-gray-50/35',
    valueButton:
      'group/value flex w-full min-w-0 items-center justify-start rounded-lg border-0 bg-transparent! px-1.5 py-0.5 text-left font-mono text-xs text-zinc-500 shadow-none! hover:bg-transparent! pressed:bg-transparent!',
    valueButtonContent:
      'inline-flex max-w-full min-w-0 items-center gap-1 rounded-lg px-1.5 py-0.5 group-hover/value:bg-gray-100 group-pressed/value:bg-gray-200',
    valueButtonMeta: 'shrink-0 font-sans text-0.5xs text-zinc-400',
    valueStatus: 'px-3 py-2 text-xs text-zinc-500',
    sizeText: 'font-mono text-xs text-zinc-500',
    collapsedPreview:
      'flex max-w-full min-w-0 items-baseline gap-1 overflow-hidden font-mono text-xs whitespace-nowrap text-zinc-500',
    collapsedPreviewPair:
      'inline-flex max-w-full shrink-0 items-baseline gap-1',
    collapsedPreviewKey: 'font-medium text-zinc-600',
    collapsedPreviewValue:
      'inline-block max-w-[28ch] truncate align-bottom text-zinc-500',
    collapsedPreviewPunctuation: 'shrink-0 text-zinc-400',
    actionsCell: '[&&&]:overflow-visible',
    actions: 'flex min-w-0 items-center justify-end gap-1.5',
    objectActionButton:
      'invisible absolute right-full z-2 translate-x-px rounded-l-md rounded-r-none px-2 py-0.5 [font-size:inherit] [line-height:inherit] group-focus-within:visible group-hover:visible',
    childObjectCell: 'bg-gray-50/35',
    childRow: 'bg-white hover:bg-gray-50',
    childRowLast: '[&_td]:border-b! [&_td]:border-gray-200',
    loadMoreCell: 'bg-gray-50/60',
  },
});

export function StateObjectTable({
  items,
  codecOptions,
  serviceName,
  serviceType,
  isLoading,
  numOfRows,
  onOpenObject,
  onEditObject,
  onDeleteObject,
  onEditValue,
}: {
  items: StateObjectRecord[];
  codecOptions?: RestateCodecOptions;
  serviceName: string;
  serviceType: StateServiceType;
  isLoading?: boolean;
  numOfRows: number;
  onOpenObject: (key: string, scope?: string) => void;
  onEditObject: (row: StateObjectRecord) => void;
  onDeleteObject: (row: StateObjectRecord) => void;
  onEditValue: (row: StateObjectRecord, stateKey: string) => void;
}) {
  const hasScopeColumn = items.some((item) => item.scope !== undefined);
  const columns = useMemo<PanelTableColumn<StateTableColumnId>[]>(
    () => [
      {
        id: 'object_key',
        name: 'Object key',
        isRowHeader: true,
        defaultWidth: 240,
        minWidth: 180,
      },
      ...(hasScopeColumn
        ? ([
            {
              id: 'scope',
              name: 'Scope',
              defaultWidth: 180,
              minWidth: 140,
            },
          ] satisfies PanelTableColumn<StateTableColumnId>[])
        : []),
      {
        id: 'state_key',
        name: 'State key',
        defaultWidth: 220,
        minWidth: 160,
      },
      {
        id: 'value',
        name: 'Value',
        minWidth: 360,
      },
      {
        id: 'size',
        name: 'Size',
        width: 96,
      },
      {
        id: 'actions',
        name: 'Actions',
        hideLabel: true,
        width: 72,
      },
    ],
    [hasScopeColumn],
  );
  const [collapsedKeys, setCollapsedKeys] = useState<Set<Key>>(() => new Set());
  const [expandedStateKeys, setExpandedStateKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const expandedKeys = useMemo(
    () =>
      new Set<Key>(
        items
          .map((item) => item.id)
          .filter((itemId) => !collapsedKeys.has(itemId)),
      ),
    [collapsedKeys, items],
  );
  const objectRows = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );

  return (
    <PanelTable
      aria-label="State"
      columns={columns}
      items={items}
      isLoading={isLoading}
      numOfRows={numOfRows}
      treeColumn="object_key"
      expandedKeys={expandedKeys}
      onExpandedChange={(nextExpandedKeys) => {
        const nextExpanded = new Set(nextExpandedKeys);
        setCollapsedKeys(
          new Set(
            items
              .map((item) => item.id)
              .filter((itemId) => !nextExpanded.has(itemId)),
          ),
        );
      }}
      onRowAction={(rowId) => {
        const row = objectRows.get(String(rowId));
        if (row) {
          onOpenObject(row.key, row.scope);
        }
      }}
      bodyDependencies={[
        codecOptions,
        expandedKeys,
        expandedStateKeys,
        serviceName,
        serviceType,
      ]}
      rowDependencies={[codecOptions, expandedKeys, expandedStateKeys]}
      renderCell={(row, col) => (
        <StateObjectCell
          row={row}
          col={col}
          codecOptions={codecOptions}
          isExpanded={expandedKeys.has(row.id)}
          onEditObject={onEditObject}
          onDeleteObject={onDeleteObject}
        />
      )}
      renderChildRows={(row, tableColumns) => (
        <StateObjectChildRows
          row={row}
          columns={tableColumns}
          codecOptions={codecOptions}
          serviceName={serviceName}
          serviceType={serviceType}
          isShowingAllKeys={expandedStateKeys.has(row.id)}
          onShowAllKeys={() =>
            setExpandedStateKeys((prev) => new Set(prev).add(row.id))
          }
          onEditValue={(stateKey) => onEditValue(row, stateKey)}
        />
      )}
    />
  );
}

function StateObjectCell({
  row,
  col,
  codecOptions,
  isExpanded,
  onEditObject,
  onDeleteObject,
}: {
  row: StateObjectRecord;
  col: PanelTableColumn<StateTableColumnId>;
  codecOptions?: RestateCodecOptions;
  isExpanded: boolean;
  onEditObject: (row: StateObjectRecord) => void;
  onDeleteObject: (row: StateObjectRecord) => void;
}) {
  const {
    objectKeyCell,
    objectKey,
    chevron,
    objectIcon,
    actionsCell,
    actions,
    objectActionButton,
    sizeText,
  } = stateObjectStyles();

  if (col.id === 'object_key') {
    return (
      <Cell className={objectKeyCell()}>
        <div className={objectKey()}>
          {row.state.length > 0 ? (
            <Button slot="chevron" variant="icon" className={chevron()}>
              <Icon name={IconName.ChevronRight} className="h-full w-full" />
            </Button>
          ) : (
            <span className="h-5 w-5 shrink-0" />
          )}
          <span className={objectIcon()}>
            <Icon name={IconName.Database} className="h-4 w-4" />
          </span>
          <KeyCell serviceKey={row.key} className="text-sm font-medium" />
        </div>
      </Cell>
    );
  }

  if (col.id === 'scope') {
    return (
      <Cell>
        {row.scope !== undefined ? (
          <KeyCell serviceKey={row.scope} className="text-sm font-medium" />
        ) : null}
      </Cell>
    );
  }

  if (col.id === 'state_key') {
    return (
      <Cell>
        <span className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-medium text-gray-500">
          {row.state.length}{' '}
          {formatPlurals(row.state.length, { one: 'key', other: 'keys' })}
        </span>
      </Cell>
    );
  }

  if (col.id === 'size') {
    return (
      <Cell>
        <span className={sizeText()}>
          {formatBytes(
            row.state.reduce((total, state) => total + state.size, 0),
          )}
        </span>
      </Cell>
    );
  }

  if (col.id === 'value') {
    if (isExpanded) {
      return <Cell />;
    }

    return (
      <Cell>
        <StateObjectCollapsedPreview row={row} codecOptions={codecOptions} />
      </Cell>
    );
  }

  if (col.id === 'actions') {
    return (
      <Cell className={actionsCell()}>
        <div className={actions()}>
          <SplitButton
            mini
            menus={
              <>
                <DropdownItem value="edit">Edit…</DropdownItem>
                <DropdownItem destructive value="delete">
                  Delete…
                </DropdownItem>
              </>
            }
            splitClassName="rounded-r-lg px-1.5 py-1"
            onSelect={(key) => {
              if (key === 'edit') {
                onEditObject(row);
              }
              if (key === 'delete') {
                onDeleteObject(row);
              }
            }}
          >
            <EditStateTrigger
              variant="secondary"
              onClick={() => onEditObject(row)}
              className={objectActionButton()}
            >
              Edit
            </EditStateTrigger>
          </SplitButton>
        </div>
      </Cell>
    );
  }

  return <Cell />;
}

function StateObjectCollapsedPreview({
  row,
  codecOptions,
}: {
  row: StateObjectRecord;
  codecOptions?: RestateCodecOptions;
}) {
  const {
    collapsedPreview,
    collapsedPreviewPair,
    collapsedPreviewKey,
    collapsedPreviewValue,
    collapsedPreviewPunctuation,
  } = stateObjectStyles();
  const previewState = row.state.slice(0, COLLAPSED_STATE_PREVIEW_KEYS);
  const hiddenCount = row.state.length - previewState.length;

  return (
    <span className={collapsedPreview()}>
      <span className={collapsedPreviewPunctuation()}>{'{'}</span>
      {previewState.map((state, index) => (
        <Fragment key={state.name}>
          {index > 0 ? (
            <span className={collapsedPreviewPunctuation()}>,</span>
          ) : null}
          <span className={collapsedPreviewPair()}>
            <span className={collapsedPreviewKey()}>{state.name}</span>
            <span className={collapsedPreviewPunctuation()}>:</span>
            {state.value !== undefined ? (
              <StaticCodecOptionsProvider
                options={{
                  ...codecOptions,
                  key: row.key,
                  command: {
                    type: 'GetState',
                    name: state.name,
                  },
                }}
              >
                <DecodedValue
                  value={state.value}
                  isBase64
                  className={collapsedPreviewValue()}
                />
              </StaticCodecOptionsProvider>
            ) : (
              <>
                <span className={collapsedPreviewPunctuation()}>{'<'}</span>
                <span className={collapsedPreviewValue()}>
                  {formatBytes(state.size)}
                </span>
                <span className={collapsedPreviewPunctuation()}>{'>'}</span>
              </>
            )}
          </span>
        </Fragment>
      ))}
      {hiddenCount > 0 ? (
        <>
          {previewState.length > 0 ? (
            <span className={collapsedPreviewPunctuation()}>,</span>
          ) : null}
          <span className={collapsedPreviewPunctuation()}>...</span>
        </>
      ) : null}
      <span className={collapsedPreviewPunctuation()}>{'}'}</span>
    </span>
  );
}

function StateObjectChildRows({
  row,
  columns,
  codecOptions,
  serviceName,
  serviceType,
  isShowingAllKeys,
  onShowAllKeys,
  onEditValue,
}: {
  row: StateObjectRecord;
  columns: PanelTableColumn[];
  codecOptions?: RestateCodecOptions;
  serviceName: string;
  serviceType: StateServiceType;
  isShowingAllKeys: boolean;
  onShowAllKeys: VoidFunction;
  onEditValue: (stateKey: string) => void;
}) {
  const visibleState = isShowingAllKeys
    ? row.state
    : row.state.slice(0, VISIBLE_STATE_KEYS);
  const hiddenKeyCount = row.state.length - visibleState.length;
  const childRows: StateChildRow[] = [
    ...visibleState.map(({ name, value, size }) => ({
      id: `${row.id}\x00${name}`,
      kind: 'state' as const,
      name,
      value,
      size,
    })),
    ...(hiddenKeyCount > 0
      ? ([
          {
            id: `${row.id}\x00__load_more__`,
            kind: 'load_more' as const,
            hiddenCount: hiddenKeyCount,
          },
        ] satisfies StateChildRow[])
      : []),
  ];
  const { childRow, childRowLast } = stateObjectStyles();
  const lastChildRowId = childRows.at(-1)?.id;

  return (
    <Collection
      items={childRows}
      dependencies={[
        row.key,
        row.scope,
        columns,
        codecOptions,
        serviceName,
        serviceType,
        isShowingAllKeys,
      ]}
    >
      {(child) => (
        <Row
          id={child.id}
          columns={columns}
          leadingCell={<Cell />}
          className={childRow({
            className: child.id === lastChildRowId ? childRowLast() : undefined,
          })}
        >
          {(col) => (
            <StateChildCell
              row={row}
              child={child}
              col={col}
              codecOptions={codecOptions}
              serviceName={serviceName}
              serviceType={serviceType}
              onShowAllKeys={onShowAllKeys}
              onEditValue={onEditValue}
            />
          )}
        </Row>
      )}
    </Collection>
  );
}

function StateChildCell({
  row,
  child,
  col,
  codecOptions,
  serviceName,
  serviceType,
  onShowAllKeys,
  onEditValue,
}: {
  row: StateObjectRecord;
  child: StateChildRow;
  col: PanelTableColumn;
  codecOptions?: RestateCodecOptions;
  serviceName: string;
  serviceType: StateServiceType;
  onShowAllKeys: VoidFunction;
  onEditValue: (stateKey: string) => void;
}) {
  const {
    childObjectCell,
    stateKeyCell,
    loadMoreCell,
    actionsCell,
    actions,
    objectActionButton,
    sizeText,
  } = stateObjectStyles();

  if (col.id === 'object_key' || col.id === 'scope') {
    return <Cell className={childObjectCell()} />;
  }

  if (child.kind === 'load_more') {
    if (col.id === 'state_key') {
      return (
        <Cell className={loadMoreCell()}>
          <Button
            variant="secondary"
            onClick={onShowAllKeys}
            className="w-fit rounded-lg px-2 py-1 text-xs font-normal text-gray-600"
          >
            Load {child.hiddenCount} more{' '}
            {child.hiddenCount === 1 ? 'key' : 'keys'}
          </Button>
        </Cell>
      );
    }
    return <Cell className={loadMoreCell()} />;
  }

  if (col.id === 'state_key') {
    return (
      <Cell className={stateKeyCell()}>
        <KeyCell serviceKey={child.name} className="text-xs font-medium" />
      </Cell>
    );
  }

  if (col.id === 'size') {
    return (
      <Cell>
        <span className={sizeText()}>{formatBytes(child.size)}</span>
      </Cell>
    );
  }

  if (col.id === 'value') {
    return (
      <Cell>
        <StateValuePreview
          name={child.name}
          value={child.value}
          size={child.size}
          row={row}
          codecOptions={codecOptions}
          serviceName={serviceName}
          serviceType={serviceType}
          onEdit={() => onEditValue(child.name)}
        />
      </Cell>
    );
  }

  if (col.id === 'actions') {
    return (
      <Cell className={actionsCell()}>
        <div className={actions()}>
          <SplitButton
            mini
            menus={<DropdownItem value="edit">Edit…</DropdownItem>}
            splitClassName="rounded-r-lg px-1.5 py-1"
            onSelect={(key) => {
              if (key === 'edit') {
                onEditValue(child.name);
              }
            }}
          >
            <EditStateTrigger
              onClick={() => onEditValue(child.name)}
              variant="secondary"
              className={objectActionButton()}
            >
              Edit
            </EditStateTrigger>
          </SplitButton>
        </div>
      </Cell>
    );
  }

  return <Cell />;
}

function StateValuePreview({
  name,
  value,
  size,
  row,
  codecOptions,
  serviceName,
  serviceType,
  onEdit,
}: {
  name: string;
  value?: string;
  size: number;
  row: StateObjectRecord;
  codecOptions?: RestateCodecOptions;
  serviceName: string;
  serviceType: StateServiceType;
  onEdit: VoidFunction;
}) {
  const portalId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const { EncodingWaterMark } = useRestateContext();
  const { valueButton, valueButtonContent, valueButtonMeta, valueStatus } =
    stateObjectStyles();
  const valueQuery = useGetVirtualObjectState(
    serviceName,
    row.key,
    row.scope,
    serviceType,
    {
      enabled: isOpen && value === undefined,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    },
    [name],
  );
  const fetchedValue = useMemo(() => {
    return valueQuery.data?.state.find((state) => state.name === name)?.value;
  }, [name, valueQuery.data]);
  const resolvedValue = value ?? fetchedValue;
  const isValueLoaded = resolvedValue !== undefined;
  const stateCodecOptions = {
    ...codecOptions,
    key: row.key,
    command: {
      type: 'GetState' as const,
      name,
    },
  };

  return (
    <Popover onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <Button variant="secondary" className={valueButton()}>
          <span className={valueButtonContent()}>
            {EncodingWaterMark && isValueLoaded && (
              <EncodingWaterMark
                value={resolvedValue}
                mini
                className="shrink-0"
              />
            )}
            <span className="block min-w-0 truncate font-mono text-xs text-zinc-500">
              {isValueLoaded ? (
                <StaticCodecOptionsProvider options={stateCodecOptions}>
                  <DecodedValue value={resolvedValue} isBase64 />
                </StaticCodecOptionsProvider>
              ) : (
                <span className="text-gray-500">Load value</span>
              )}
            </span>
            {!isValueLoaded ? (
              <span className={valueButtonMeta()}>{formatBytes(size)}</span>
            ) : null}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent>
        <DropdownSection
          className="mb-1 w-[90vw] max-w-[min(90vw,64rem)] overflow-auto py-0 pr-0 pl-4"
          title={
            <div className="flex min-w-0 items-center gap-2 text-0.5xs">
              <span className="min-w-0 truncate font-mono">
                <TruncateWithTooltip copyText={name}>
                  {name}
                </TruncateWithTooltip>
              </span>
              <Portal id={portalId} className="mr-1 ml-auto shrink-0" />
              <EditStateTrigger
                onClick={onEdit}
                variant="secondary"
                className="flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-normal"
              >
                Edit
                <Icon name={IconName.ExternalLink} className="h-3 w-3" />
              </EditStateTrigger>
            </div>
          }
        >
          {isValueLoaded ? (
            <StaticCodecOptionsProvider options={stateCodecOptions}>
              <Value
                value={resolvedValue}
                className="w-full py-0 font-mono text-xs"
                showCopyButton
                portalId={portalId}
                isBase64
              />
            </StaticCodecOptionsProvider>
          ) : valueQuery.error ? (
            <div className="py-3 pr-4">
              <ErrorBanner
                error={valueQuery.error}
                className="w-full rounded-xl text-left"
              />
            </div>
          ) : (
            <div className={valueStatus()}>
              {valueQuery.isFetching ? 'Loading value…' : 'Value not found'}
            </div>
          )}
        </DropdownSection>
      </PopoverContent>
    </Popover>
  );
}

const stylesKey = tv({
  base: 'relative -ml-1 w-fit max-w-full font-mono text-zinc-600',
  slots: {
    text: '',
    container: 'inline-flex w-full items-center pl-1 align-middle',
  },
});

function KeyCell({
  serviceKey,
  className,
}: {
  serviceKey: string;
  className?: string;
}) {
  const { base, text, container } = stylesKey();
  return (
    <div className={base({ className })}>
      <div className={container({})}>
        <TruncateWithTooltip copyText={serviceKey}>
          <span className={text()}>{serviceKey}</span>
        </TruncateWithTooltip>
      </div>
    </div>
  );
}
