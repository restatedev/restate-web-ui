import { useMemo } from 'react';
import {
  GridList as AriaGridList,
  Virtualizer,
  ListLayout,
} from 'react-aria-components';
import { tv } from '@restate/util/styles';
import { Icon, IconName } from '@restate/ui/icons';
import { Button } from '@restate/ui/button';
import { GridListColumnsContext } from './GridListContext';
import { GridListColumn, GridListProps } from './types';

const containerStyles = tv({
  base: 'flex flex-col',
});

const headerStyles = tv({
  base: 'grid items-center gap-x-2 py-1',
});

const headerCellStyles = tv({
  base: 'flex items-center gap-1 text-start text-sm font-medium text-gray-500',
  variants: {
    allowsSorting: {
      true: 'w-auto cursor-pointer justify-start justify-self-start rounded-lg select-none',
      false: 'cursor-default',
    },
  },
});

const sortIconStyles = tv({
  base: 'flex h-4 w-4 items-center justify-center transition',
  variants: {
    direction: {
      ascending: '',
      descending: 'rotate-180',
    },
  },
});

const listStyles = tv({
  base: 'gap-2 px-2 pt-1 pb-2 outline-none [scrollbar-gutter:stable] [scrollbar-width:thin]',
  variants: {
    virtualized: {
      true: 'block',
      false: 'flex flex-col overflow-auto',
    },
  },
  defaultVariants: {
    virtualized: false,
  },
});

function GridListHeader<T extends object>({
  columns,
  gridTemplateColumns,
  sortDescriptor,
  onSortChange,
  className,
}: {
  columns: GridListColumn<T>[];
  gridTemplateColumns: string;
  sortDescriptor?: GridListProps<T>['sortDescriptor'];
  onSortChange?: GridListProps<T>['onSortChange'];
  className?: string;
}) {
  return (
    <div
      role="presentation"
      className={headerStyles({ className })}
      style={{ gridTemplateColumns }}
    >
      {columns.map((column) => {
        const isSorted = sortDescriptor?.column === column.id;
        const sortDirection = isSorted ? sortDescriptor.direction : undefined;

        if (column.allowsSorting && onSortChange) {
          return (
            <Button
              key={column.id}
              variant="icon"
              className={headerCellStyles({ allowsSorting: true })}
              onClick={() => {
                onSortChange({
                  column: column.id,
                  direction:
                    isSorted && sortDescriptor.direction === 'ascending'
                      ? 'descending'
                      : 'ascending',
                });
              }}
            >
              {column.title}
              {sortDirection && (
                <span className={sortIconStyles({ direction: sortDirection })}>
                  <Icon
                    name={IconName.ArrowUp}
                    className="h-3 w-3 text-gray-600"
                  />
                </span>
              )}
            </Button>
          );
        }

        return (
          <div
            key={column.id}
            role="presentation"
            className={headerCellStyles({ allowsSorting: false })}
          >
            {column.title}
          </div>
        );
      })}
    </div>
  );
}

export function GridList<T extends object>({
  columns,
  items,
  children,
  sortDescriptor,
  onSortChange,
  selectionMode,
  selectedKeys,
  onSelectionChange,
  onAction,
  renderEmptyState,
  dependencies,
  virtualized = false,
  estimatedRowHeight = 60,
  className,
  headerClassName,
  ...props
}: GridListProps<T>) {
  const gridTemplateColumns = useMemo(
    () => columns.map((c) => c.width ?? '1fr').join(' '),
    [columns],
  );

  const layoutOptions = useMemo(
    () => ({ estimatedRowHeight, gap: 8, padding: 0 }),
    [estimatedRowHeight],
  );

  return (
    <GridListColumnsContext.Provider value={columns as GridListColumn<never>[]}>
      <div
        className={containerStyles({ className })}
        style={
          {
            '--grid-list-template-columns': gridTemplateColumns,
          } as React.CSSProperties
        }
      >
        <GridListHeader
          columns={columns}
          gridTemplateColumns={gridTemplateColumns}
          sortDescriptor={sortDescriptor}
          onSortChange={onSortChange}
          className={headerClassName}
        />
        {virtualized ? (
          <Virtualizer layout={ListLayout} layoutOptions={layoutOptions}>
            <AriaGridList
              aria-label={props['aria-label']}
              items={items}
              dependencies={dependencies}
              selectionMode={selectionMode}
              selectedKeys={selectedKeys}
              onSelectionChange={onSelectionChange}
              onAction={onAction}
              renderEmptyState={renderEmptyState}
              className={listStyles({ virtualized: true })}
            >
              {children}
            </AriaGridList>
          </Virtualizer>
        ) : (
          <AriaGridList
            aria-label={props['aria-label']}
            items={items}
            dependencies={dependencies}
            selectionMode={selectionMode}
            selectedKeys={selectedKeys}
            onSelectionChange={onSelectionChange}
            onAction={onAction}
            renderEmptyState={renderEmptyState}
            className={listStyles()}
          >
            {children}
          </AriaGridList>
        )}
      </div>
    </GridListColumnsContext.Provider>
  );
}
