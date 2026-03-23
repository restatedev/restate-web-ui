import { ReactNode } from 'react';
import { Key, Selection, SortDescriptor } from 'react-aria-components';

export interface GridListColumn<T> {
  id: string;
  title: ReactNode;
  width?: string;
  allowsSorting?: boolean;
  render: (item: T) => ReactNode;
}

export interface GridListProps<T extends object> {
  'aria-label': string;
  columns: GridListColumn<T>[];
  items: T[];
  children: (item: T) => ReactNode;
  sortDescriptor?: SortDescriptor;
  onSortChange?: (descriptor: SortDescriptor) => void;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterPlaceholder?: string;
  selectionMode?: 'none' | 'single' | 'multiple';
  selectedKeys?: Selection;
  onSelectionChange?: (keys: Selection) => void;
  onAction?: (key: Key) => void;
  renderEmptyState?: () => ReactNode;
  estimatedRowHeight?: number;
  className?: string;
}

export interface GridListItemProps<T> {
  id: Key;
  item: T;
  textValue: string;
  children?: (props: { cells: ReactNode }) => ReactNode;
  className?: string;
}
