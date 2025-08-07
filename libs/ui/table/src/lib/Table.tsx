import { focusRing } from '@restate/ui/focus';
import { tv } from 'tailwind-variants';
import {
  Column as AriaColumn,
  Table as AriaTable,
  TableHeader as AriaTableHeader,
  Collection,
  ColumnProps as AriaColumnProps,
  ColumnResizer,
  Group,
  ResizableTableContainer,
  TableBodyProps as AriaTableBodyProps,
  TableHeaderProps as AriaTableHeaderProps,
  TableProps as AriaTableProps,
  composeRenderProps,
  useTableOptions,
  TableBody as AriaTableBody,
} from 'react-aria-components';
import { Icon, IconName } from '@restate/ui/icons';
import { Checkbox } from '@restate/ui/form-field';
import { PropsWithChildren, ReactNode } from 'react';
import { TableError, LoadingRows } from './Placeholder';
import { TruncateWithTooltip } from '@restate/ui/tooltip';

interface TableProps
  extends Pick<
    AriaTableProps,
    'selectionMode' | 'aria-label' | 'sortDescriptor' | 'onSortChange'
  > {
  className?: string;
}

const tableStyles = tv({
  base: 'to-gray-50 from-gray-100 bg-linear-to-b [&:has([data-table-empty=true])]:bg-gray-50/50 shadow-xs shadow-zinc-800/5 [&:has([data-table-empty=true])]:shadow-none border rounded-xl overflow-hidden',
});
export function Table({ className, ...props }: PropsWithChildren<TableProps>) {
  return (
    <div className={`${tableStyles({ className })}`}>
      <div className="relative h-full overflow-auto [scrollbar-gutter:stable] [scrollbar-width:thin]">
        <ResizableTableContainer>
          <AriaTable
            {...props}
            className="border-collapse border-spacing-0 rounded-xl bg-gray-50"
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
  base: 'resizer absolute right-0 w-px px-[8px] box-content py-1 h-5 bg-clip-content bg-gray-400 cursor-col-resize rounded-sm resizing:bg-blue-600 resizing:w-[2px] resizing:pl-[7px] -outline-offset-2',
});

const columnStyles = tv({
  base: 'py-2 last:pr-2 pl-2 [&:not(:last-child)_.resizer]:translate-x-[10px] [&:hover]:z-20 focus-within:z-20 text-start text-sm font-semibold text-gray-700 cursor-default',
});

interface ColumnProps
  extends Pick<
    AriaColumnProps,
    | 'id'
    | 'allowsSorting'
    | 'isRowHeader'
    | 'width'
    | 'maxWidth'
    | 'minWidth'
    | 'defaultWidth'
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
          <div className="relative flex items-center">
            <Group
              role="presentation"
              tabIndex={-1}
              className={columnGroupStyles}
            >
              <TruncateWithTooltip hideCopy>{children}</TruncateWithTooltip>
              {allowsSorting && (
                <span
                  className={`flex h-4 w-4 items-center justify-center transition ${
                    sortDirection === 'descending' ? 'rotate-180' : ''
                  }`}
                >
                  {sortDirection && (
                    <Icon
                      name={IconName.ChevronUp}
                      className="h-4 w-4 text-gray-500 dark:text-zinc-400 forced-colors:text-[ButtonText]"
                    />
                  )}
                </span>
              )}
            </Group>
            {!props.width && <ColumnResizer className={resizerStyles()} />}
          </div>
        ),
      )}
    </AriaColumn>
  );
}

const tableHeaderStyles = tv({
  base: 'sticky top-0 z-10 bg-gray-100/80 drop-shadow-[0px_1px_0px_rgba(0,0,0,0.1)] [box-shadow2:0_1px_0px_0px_rgba(0,0,0,0.1)] backdrop-blur-xl backdrop-saturate-200 supports-[-moz-appearance:none]:bg-gray-100',
});

interface TableHeaderProps<T extends object>
  extends Pick<
    AriaTableHeaderProps<T>,
    'columns' | 'children' | 'dependencies'
  > {
  className?: string;
}

export function TableHeader<T extends object>({
  className,
  ...props
}: TableHeaderProps<T>) {
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
          className="cursor-default p-2 text-start text-sm font-semibold"
        >
          {selectionMode === 'multiple' && <Checkbox slot="selection" />}
        </AriaColumn>
      )}
      <Collection items={props.columns}>{props.children}</Collection>
    </AriaTableHeader>
  );
}

interface TableBodyProps<T extends object>
  extends Pick<AriaTableBodyProps<T>, 'items' | 'children' | 'dependencies'> {
  className?: string;
  isLoading?: boolean;
  error?: Error | null;
  numOfColumns: number;
  numOfRows?: number;
  emptyPlaceholder?: ReactNode;
}

export function TableBody<T extends object>({
  isLoading,
  error,
  children,
  dependencies = [],
  numOfColumns,
  emptyPlaceholder,
  numOfRows,
  ...props
}: TableBodyProps<T>) {
  return (
    <AriaTableBody
      {...props}
      dependencies={[...dependencies, error, isLoading]}
      renderEmptyState={() => {
        return (
          <div data-table-empty="true">
            {error ? <TableError error={error} /> : emptyPlaceholder}
          </div>
        );
      }}
    >
      {isLoading ? (
        <LoadingRows numOfColumns={numOfColumns} numOfRows={numOfRows} />
      ) : (
        children
      )}
    </AriaTableBody>
  );
}
