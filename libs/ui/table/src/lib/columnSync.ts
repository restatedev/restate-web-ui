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
  const tableRect = headerTable.getBoundingClientRect();
  const layout = new Map([
    [columnKey(LEFT_SPACER_ID), { left: 0, width: SPACER_WIDTH }],
    [
      columnKey(RIGHT_SPACER_ID),
      { left: SPACER_WIDTH + tableRect.width, width: SPACER_WIDTH },
    ],
  ]);
  stickyHeader.querySelectorAll('thead th[data-key]').forEach((th) => {
    const rect = th.getBoundingClientRect();
    layout.set(th.getAttribute('data-key') ?? '', {
      left: SPACER_WIDTH + rect.left - tableRect.left,
      width: rect.width,
    });
  });
  const keysByIndex = new Map<string, string>();
  dataTable
    .querySelectorAll<HTMLElement>('[role=columnheader][data-key]')
    .forEach((columnHeader) => {
      const key = columnHeader.dataset['key'] ?? '';
      const column = layout.get(key);
      if (!column) return;
      columnHeader.style.width = `${column.width}px`;
      const index = columnHeader.getAttribute('aria-colindex');
      if (index) keysByIndex.set(index, key);
    });
  dataTable.querySelectorAll('[aria-colindex]').forEach((element) => {
    const column = layout.get(
      keysByIndex.get(element.getAttribute('aria-colindex') ?? '') ?? '',
    );
    const wrapper = element.parentElement;
    if (!column || wrapper?.style.position !== 'absolute') return;
    wrapper.style.left = `${column.left}px`;
    wrapper.style.width = `${column.width}px`;
  });
  const totalWidth = `${2 * SPACER_WIDTH + tableRect.width}px`;
  const content = dataTable.querySelector<HTMLElement>(
    '[role=grid] > [role=presentation]',
  );
  if (!content || content.style.width === totalWidth) return;
  content.style.width = totalWidth;
  content
    .querySelectorAll<HTMLElement>(
      ':scope > [role=presentation], [role=rowgroup] > [role=presentation]',
    )
    .forEach((wrapper) => {
      wrapper.style.width = totalWidth;
    });
}
