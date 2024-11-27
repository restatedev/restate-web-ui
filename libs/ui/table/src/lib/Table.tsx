import { focusRing } from '@restate/ui/focus';
import { tv } from 'tailwind-variants';
import {
  Cell as AriaCell,
  Column as AriaColumn,
  Row as AriaRow,
  Table as AriaTable,
  TableHeader as AriaTableHeader,
  Button,
  CellProps as AriaCellProps,
  Collection,
  ColumnProps as AriaColumnProps,
  ColumnResizer,
  Group,
  ResizableTableContainer,
  RowProps as AriaRowProps,
  TableBodyProps as AriaTableBodyProps,
  TableHeaderProps as AriaTableHeaderProps,
  TableProps as AriaTableProps,
  composeRenderProps,
  useTableOptions,
  TableBody as AriaTableBody,
} from 'react-aria-components';
import { Icon, IconName } from '@restate/ui/icons';
import { Checkbox } from '@restate/ui/form-field';
import styles from './table.module.css';
import { PropsWithChildren } from 'react';

interface TableProps
  extends Pick<
    AriaTableProps,
    'selectionMode' | 'aria-label' | 'sortDescriptor' | 'onSortChange'
  > {
  className?: string;
}

const tableStyles = tv({
  base: 'bg-gray-50 border rounded-xl overflow-hidden',
});
export function Table({ className, ...props }: PropsWithChildren<TableProps>) {
  return (
    <div className={`${tableStyles({ className })}`}>
      <div className={`${styles.table} relative overflow-auto h-full`}>
        <ResizableTableContainer>
          <AriaTable
            {...props}
            className="border2-separate border-collapse border-spacing-0"
          />
        </ResizableTableContainer>
      </div>
    </div>
  );
}

const columnGroupStyles = tv({
  extend: focusRing,
  base: 'h-5 flex-1 flex gap-1 items-center overflow-hidden',
});

const resizerStyles = tv({
  extend: focusRing,
  base: 'absolute right-0 w-px px-[8px] box-content py-1 h-5 bg-clip-content bg-gray-400 cursor-col-resize rounded resizing:bg-blue-600 resizing:w-[2px] resizing:pl-[7px] -outline-offset-2',
});

const columnStyles = tv({
  base: '[&:hover]:z-20 [&:focus-within]:z-20 text-start text-sm font-semibold text-gray-700 cursor-default',
});

interface ColumnProps
  extends Pick<
    AriaColumnProps,
    'id' | 'allowsSorting' | 'isRowHeader' | 'width' | 'maxWidth' | 'minWidth'
  > {
  className?: string;
}

export function Column({
  className,
  ...props
}: PropsWithChildren<ColumnProps>) {
  return (
    <AriaColumn minWidth={0} {...props} className={columnStyles({ className })}>
      {composeRenderProps(
        props.children,
        (children, { allowsSorting, sortDirection }) => (
          <div className="flex items-center relative">
            <Group
              role="presentation"
              tabIndex={-1}
              className={columnGroupStyles}
            >
              <span className="truncate">{children}</span>
              {allowsSorting && (
                <span
                  className={`w-4 h-4 flex items-center justify-center transition ${
                    sortDirection === 'descending' ? 'rotate-180' : ''
                  }`}
                >
                  {sortDirection && (
                    <Icon
                      name={IconName.ChevronUp}
                      className="w-4 h-4 text-gray-500 dark:text-zinc-400 forced-colors:text-[ButtonText]"
                    />
                  )}
                </span>
              )}
            </Group>
            {!props.width && <ColumnResizer className={resizerStyles()} />}
          </div>
        )
      )}
    </AriaColumn>
  );
}

const tableHeaderStyles = tv({
  base: 'sticky top-0 z-10 bg-gray-100/80 [box-shadow:0_1px_0px_0px_rgba(0,0,0,0.1)] backdrop-blur-xl backdrop-saturate-200 supports-[-moz-appearance:none]:bg-gray-100',
});

interface TableHeaderProps<T extends object>
  extends Pick<AriaTableHeaderProps<T>, 'columns'> {
  className?: string;
}

export function TableHeader<T extends object>({
  className,
  ...props
}: PropsWithChildren<TableHeaderProps<T>>) {
  const { selectionBehavior, selectionMode, allowsDragging } =
    useTableOptions();

  return (
    <AriaTableHeader {...props} className={tableHeaderStyles({ className })}>
      {/* Add extra columns for drag and drop and selection. */}
      {allowsDragging && <Column />}
      {selectionBehavior === 'toggle' && (
        <AriaColumn
          width={36}
          minWidth={36}
          className="text-start text-sm font-semibold cursor-default p-2"
        >
          {selectionMode === 'multiple' && <Checkbox slot="selection" />}
        </AriaColumn>
      )}
      <Collection items={props.columns}>{props.children}</Collection>
    </AriaTableHeader>
  );
}

const rowStyles = tv({
  extend: focusRing,
  base: 'group/row relative cursor-default select-none -outline-offset-2 text-gray-900 disabled:text-gray-300 text-sm hover:bg-gray-100 selected:bg-blue-100 selected:hover:bg-blue-200',
});

interface RowProps<T extends object>
  extends Pick<AriaRowProps<T>, 'id' | 'columns'> {
  className?: string;
}

export function Row<T extends object>({
  id,
  columns,
  children,
  className,
  ...otherProps
}: PropsWithChildren<RowProps<T>>) {
  const { selectionBehavior, allowsDragging } = useTableOptions();

  return (
    <AriaRow id={id} {...otherProps} className={rowStyles({ className })}>
      {allowsDragging && (
        <Cell>
          <Button slot="drag">≡</Button>
        </Cell>
      )}
      {selectionBehavior === 'toggle' && (
        <Cell className="px-2">
          <Checkbox slot="selection" />
        </Cell>
      )}
      <Collection items={columns}>{children}</Collection>
    </AriaRow>
  );
}

const cellStyles = tv({
  extend: focusRing,
  base: 'border-b group-last/row:border-b-0 [--selected-border:theme(colors.blue.200)] group-selected/row:border-[--selected-border] [:has(+[data-selected])_&]:border-[--selected-border] py-2 truncate -outline-offset-2',
});

interface CellProps extends Pick<AriaCellProps, 'id'> {
  className?: string;
}

export function Cell({ className, ...props }: PropsWithChildren<CellProps>) {
  return <AriaCell {...props} className={cellStyles({ className })} />;
}

interface TableBodyProps<T extends object>
  extends Pick<AriaTableBodyProps<T>, 'items' | 'children'> {
  className?: string;
}

export function TableBody<T extends object>(props: TableBodyProps<T>) {
  return <AriaTableBody {...props} />;
}
