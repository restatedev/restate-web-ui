import { useMemo } from 'react';
import {
  GridList as AriaGridList,
  Input,
  SearchField,
  Virtualizer,
  ListLayout,
} from 'react-aria-components';
import { tv } from '@restate/util/styles';
import { Icon, IconName } from '@restate/ui/icons';
import { GridListColumnsContext } from './GridListContext';
import { GridListColumn, GridListProps } from './types';

const containerStyles = tv({
  base: 'flex flex-col overflow-hidden rounded-xl border bg-gray-50 shadow-xs shadow-zinc-800/5',
});

const filterStyles = tv({
  base: 'flex items-center gap-2 border-b bg-white px-3 py-2',
});

const filterInputStyles = tv({
  base: 'w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400',
});

const headerStyles = tv({
  base: 'sticky top-0 z-10 grid items-center bg-gray-100/80 px-3 py-2 drop-shadow-[0px_1px_0px_rgba(0,0,0,0.1)] backdrop-blur-xl backdrop-saturate-200 supports-[-moz-appearance:none]:bg-gray-100',
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
  base: 'flex flex-col gap-2 overflow-auto p-2 outline-none [scrollbar-gutter:stable] [scrollbar-width:thin]',
});

function GridListHeader<T extends object>({
  columns,
  gridTemplateColumns,
  sortDescriptor,
  onSortChange,
}: {
  columns: GridListColumn<T>[];
  gridTemplateColumns: string;
  sortDescriptor?: GridListProps<T>['sortDescriptor'];
  onSortChange?: GridListProps<T>['onSortChange'];
}) {
  return (
    <div
      role="presentation"
      className={headerStyles()}
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
  estimatedRowHeight = 60,
  className,
  ...props
}: GridListProps<T>) {
  const gridTemplateColumns = useMemo(
    () => columns.map((c) => c.width ?? '1fr').join(' '),
    [columns]
  );

  const layoutOptions = useMemo(
    () => ({ estimatedRowHeight, gap: 8, padding: 0 }),
    [estimatedRowHeight]
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
            <Icon
              name={IconName.ScanSearch}
              className="h-4 w-4 shrink-0 text-gray-400"
            />
            <Input
              placeholder={filterPlaceholder}
              className={filterInputStyles()}
            />
          </SearchField>
        )}
        <GridListHeader
          columns={columns}
          gridTemplateColumns={gridTemplateColumns}
          sortDescriptor={sortDescriptor}
          onSortChange={onSortChange}
        />
        <Virtualizer layout={ListLayout} layoutOptions={layoutOptions}>
          <AriaGridList
            aria-label={props['aria-label']}
            items={items}
            selectionMode={selectionMode}
            selectedKeys={selectedKeys}
            onSelectionChange={onSelectionChange}
            onAction={onAction}
            renderEmptyState={renderEmptyState}
            className={listStyles()}
            style={{ display: 'block', padding: 0 }}
          >
            {children}
          </AriaGridList>
        </Virtualizer>
      </div>
    </GridListColumnsContext.Provider>
  );
}
