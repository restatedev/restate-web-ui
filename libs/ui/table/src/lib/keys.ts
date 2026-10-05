import type { Key } from 'react-aria-components';

const COLUMN_KEY_PREFIX = '\u0000col:';

export const columnKey = (id: Key) => `${COLUMN_KEY_PREFIX}${id}`;

export const fromColumnKey = (key: Key) =>
  String(key).slice(COLUMN_KEY_PREFIX.length);

export const tableHeaderKeyProps: object = { id: '\u0000internal:header' };
export const tableBodyKeyProps: object = { id: '\u0000internal:body' };
export const DRAG_COLUMN_KEY = '\u0000internal-col:drag';
export const SELECTION_COLUMN_KEY = '\u0000internal-col:selection';

export const internalCellKey = (
  rowId: Key | undefined,
  slot: 'leading' | 'drag' | 'selection',
) => (rowId == null ? undefined : `\u0000cell:${rowId}:${slot}`);
