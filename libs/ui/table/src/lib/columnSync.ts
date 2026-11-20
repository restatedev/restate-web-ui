import type { Key } from 'react-aria-components';
import { columnKey } from './keys';

export const SPACER_WIDTH = 8;
export const LEFT_SPACER_ID = '__panel_table_spacer_left__';
export const RIGHT_SPACER_ID = '__panel_table_spacer_right__';

export function measureColumnWidths(stickyHeader: HTMLElement) {
  const widths = new Map<Key, number>();
  stickyHeader.querySelectorAll('thead th[data-key]').forEach((th) => {
    const key = th.getAttribute('data-key');
    if (key) widths.set(key, th.getBoundingClientRect().width);
  });
  return widths;
}

export function keepIfSame(prev: Map<Key, number>, next: Map<Key, number>) {
  if (prev.size !== next.size) return next;
  for (const [key, width] of next) {
    if (prev.get(key) !== width) return next;
  }
  return prev;
}

export function syncDataTableColumns(
  stickyHeader: HTMLElement,
  dataTable: HTMLElement,
) {
  const headerTable = stickyHeader.querySelector('table');
  if (!headerTable) return;
  const widths = new Map([
    [columnKey(LEFT_SPACER_ID), SPACER_WIDTH],
    [columnKey(RIGHT_SPACER_ID), SPACER_WIDTH],
  ]);
  stickyHeader.querySelectorAll('thead th[data-key]').forEach((th) => {
    widths.set(
      th.getAttribute('data-key') ?? '',
      th.getBoundingClientRect().width,
    );
  });
  const keysByIndex = new Map<string, string>();
  dataTable
    .querySelectorAll<HTMLElement>('[role=columnheader][data-key]')
    .forEach((columnHeader) => {
      const key = columnHeader.dataset['key'] ?? '';
      const width = widths.get(key);
      if (width === undefined) return;
      columnHeader.style.width = `${width}px`;
      const index = columnHeader.getAttribute('aria-colindex');
      if (index) keysByIndex.set(index, key);
    });
  dataTable
    .querySelectorAll<HTMLElement>(
      ':not([data-static-row]) > [role=row] > [data-panel-table-cell] > [aria-colindex]',
    )
    .forEach((element) => {
      const width = widths.get(
        keysByIndex.get(element.getAttribute('aria-colindex') ?? '') ?? '',
      );
      if (width !== undefined && element.parentElement) {
        element.parentElement.style.width = `${width}px`;
      }
    });
  const totalWidth = `${
    2 * SPACER_WIDTH + headerTable.getBoundingClientRect().width
  }px`;
  const content = dataTable.querySelector<HTMLElement>(
    ':is([role=grid], [role=treegrid]) > [role=presentation]',
  );
  if (content) content.style.width = totalWidth;
}
