import { ReactNode } from 'react';
import { Key, Selection, SortDescriptor } from 'react-aria-components';

export interface GridListColumn<T> {
  id: string;
  title: ReactNode;
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
  selectionMode?: 'none' | 'single' | 'multiple';
  selectedKeys?: Selection;
  onSelectionChange?: (keys: Selection) => void;
  onAction?: (key: Key) => void;
  renderEmptyState?: () => ReactNode;
  dependencies?: readonly unknown[];
  virtualized?: boolean;
  estimatedRowHeight?: number;
  className?: string;
  headerClassName?: string;
}

export interface GridListItemRenderProps {
  cells: ReactNode;
  isHovered: boolean;
  isPressed: boolean;
  isFocusVisible: boolean;
  isSelected: boolean;
}

export interface GridListItemProps<T> {
  id: Key;
  item: T;
  textValue: string;
  href?: string;
  children?: (props: GridListItemRenderProps) => ReactNode;
  className?: string;
}
