import { createContext, useContext } from 'react';
import { GridListColumn } from './types';

export const GridListColumnsContext = createContext<GridListColumn<never>[]>([]);

export function useGridListColumns<T>() {
  return useContext(GridListColumnsContext) as GridListColumn<T>[];
}
