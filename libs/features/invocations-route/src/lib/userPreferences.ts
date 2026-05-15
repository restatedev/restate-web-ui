import { COLUMNS_KEYS, type ColumnKey } from './columns';
import { SORT_COLUMN_KEYS } from './useInvocationsQueryFilters';

const USER_COLS_KEY = 'invocations-user-cols';
const USER_SORT_KEY = 'invocations-user-sort';

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getUserAddedCols(): ColumnKey[] {
  const parsed = safeParse<ColumnKey[]>(localStorage.getItem(USER_COLS_KEY));
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((c): c is ColumnKey =>
    (COLUMNS_KEYS as readonly string[]).includes(c),
  );
}

function writeUserAddedCols(cols: ColumnKey[]) {
  localStorage.setItem(USER_COLS_KEY, JSON.stringify(cols));
}

export function addUserCol(col: ColumnKey) {
  const current = getUserAddedCols();
  if (current.includes(col)) return;
  writeUserAddedCols([...current, col]);
}

export function removeUserCol(col: ColumnKey) {
  const current = getUserAddedCols();
  if (!current.includes(col)) return;
  writeUserAddedCols(current.filter((c) => c !== col));
}

export interface UserSort {
  field: string;
  order: 'ASC' | 'DESC';
}

export function getUserLastSort(): UserSort | null {
  const parsed = safeParse<UserSort>(localStorage.getItem(USER_SORT_KEY));
  if (!parsed) return null;
  if (
    typeof parsed.field !== 'string' ||
    !SORT_COLUMN_KEYS.includes(parsed.field as ColumnKey)
  )
    return null;
  if (parsed.order !== 'ASC' && parsed.order !== 'DESC') return null;
  return parsed;
}

export function setUserLastSort(sort: UserSort) {
  localStorage.setItem(USER_SORT_KEY, JSON.stringify(sort));
}
