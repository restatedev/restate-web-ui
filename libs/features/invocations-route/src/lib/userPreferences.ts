import {
  getUserBreakdownCountMode,
  setUserBreakdownCountMode,
  type BreakdownCountMode,
} from '@restate/features/user-preference';
import { COLUMNS_KEYS, type ColumnKey } from './columns';
import { SORT_COLUMN_KEYS } from './useInvocationsQueryFilters';

const USER_COLS_KEY = 'invocations-user-cols';
const USER_SORT_KEY = 'invocations-user-sort';
const USER_COL_WIDTHS_KEY = 'invocations-user-col-widths';
export type CountMode = BreakdownCountMode;

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

export type UserColWidths = Partial<Record<ColumnKey, number>>;

export function getUserColWidths(): UserColWidths {
  const parsed = safeParse<Record<string, unknown>>(
    localStorage.getItem(USER_COL_WIDTHS_KEY),
  );
  if (!parsed) return {};
  const widths: UserColWidths = {};
  for (const [col, width] of Object.entries(parsed)) {
    if (
      (COLUMNS_KEYS as readonly string[]).includes(col) &&
      typeof width === 'number' &&
      Number.isFinite(width) &&
      width > 0
    ) {
      widths[col as ColumnKey] = width;
    }
  }
  return widths;
}

export function setUserColWidths(widths: Map<ColumnKey, number>) {
  localStorage.setItem(
    USER_COL_WIDTHS_KEY,
    JSON.stringify({ ...getUserColWidths(), ...Object.fromEntries(widths) }),
  );
}

export interface UserSort {
  field: (typeof SORT_COLUMN_KEYS)[number];
  order: 'ASC' | 'DESC';
}

export function getUserLastSort(): UserSort | null {
  const parsed = safeParse<UserSort>(localStorage.getItem(USER_SORT_KEY));
  if (!parsed) return null;
  if (
    typeof parsed.field !== 'string' ||
    !SORT_COLUMN_KEYS.includes(parsed.field)
  )
    return null;
  if (parsed.order !== 'ASC' && parsed.order !== 'DESC') return null;
  return parsed;
}

export function setUserLastSort(sort: UserSort) {
  localStorage.setItem(USER_SORT_KEY, JSON.stringify(sort));
}

export function getUserCountMode(): CountMode {
  return getUserBreakdownCountMode();
}

export function setUserCountMode(mode: CountMode) {
  setUserBreakdownCountMode(mode);
}
