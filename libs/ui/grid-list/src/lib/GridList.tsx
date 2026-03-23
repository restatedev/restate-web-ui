import { useMemo } from 'react';
import {
  GridList as AriaGridList,
  Input as AriaInput,
  Label,
  SearchField,
  Virtualizer,
  ListLayout,
} from 'react-aria-components';
import { tv } from '@restate/util/styles';
import { Icon, IconName } from '@restate/ui/icons';
import { GridListColumnsContext } from './GridListContext';
import { GridListColumn, GridListProps } from './types';

const containerStyles = tv({
  base: 'flex flex-col',
});

const filterStyles = tv({
  base: 'w-[30ch] outline-none',
});

const filterInputStyles = tv({
  base: 'mt-0 w-full min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 pl-8 text-sm text-gray-900 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] placeholder:text-gray-500/70 focus:border-gray-200 focus:shadow-none focus:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] focus:outline-2 focus:outline-blue-600',
});

const headerStyles = tv({
  base: 'grid items-center gap-x-2 py-2',
});

const headerCellStyles = tv({
  base: 'flex items-center gap-1 text-start text-sm font-semibold text-gray-700',
  variants: {
    allowsSorting: {
      true: 'cursor-pointer select-none',
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
  base: 'gap-2 p-2 outline-none [scrollbar-gutter:stable] [scrollbar-width:thin]',
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

        return (
          <div
            key={column.id}
            role={column.allowsSorting ? 'button' : 'presentation'}
            tabIndex={column.allowsSorting ? 0 : undefined}
            className={headerCellStyles({
              allowsSorting: Boolean(column.allowsSorting),
            })}
            onClick={
              column.allowsSorting && onSortChange
                ? () => {
                    onSortChange({
                      column: column.id,
                      direction:
                        isSorted && sortDescriptor.direction === 'ascending'
                          ? 'descending'
                          : 'ascending',
                    });
                  }
                : undefined
            }
            onKeyDown={
              column.allowsSorting && onSortChange
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSortChange({
                        column: column.id,
                        direction:
                          isSorted && sortDescriptor.direction === 'ascending'
                            ? 'descending'
                            : 'ascending',
                      });
                    }
                  }
                : undefined
            }
          >
            {column.title}
            {column.allowsSorting && (
              <span className={sortIconStyles({ direction: sortDirection })}>
                {sortDirection && (
                  <Icon
                    name={IconName.ChevronUp}
                    className="h-4 w-4 text-gray-500"
                  />
                )}
              </span>
            )}
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
  filterValue,
  onFilterChange,
  filterPlaceholder = 'Filter…',
  selectionMode,
  selectedKeys,
  onSelectionChange,
  onAction,
  renderEmptyState,
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
        {onFilterChange !== undefined && (
          <SearchField
            aria-label="Filter"
            value={filterValue ?? ''}
            onChange={onFilterChange}
            className={filterStyles()}
          >
            <Label className="sr-only">{filterPlaceholder}</Label>
            <div className="relative min-h-8.5">
              <AriaInput
                placeholder={filterPlaceholder}
                className={filterInputStyles()}
              />
              <Icon
                name={IconName.Search}
                className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              />
            </div>
          </SearchField>
        )}
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
