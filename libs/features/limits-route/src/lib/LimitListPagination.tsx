import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { formatNumber } from '@restate/util/intl';
import { useCallback, useMemo, useState } from 'react';
import { LIMIT_LIST_PAGE_SIZE } from './limits.constants';

export function useLimitListPagination<T>(items: T[], resetState: unknown) {
  const pageCount = Math.ceil(items.length / LIMIT_LIST_PAGE_SIZE);
  const lastPageIndex = Math.max(pageCount - 1, 0);
  const [pagination, setPagination] = useState(() => ({
    resetState,
    pageCount,
    pageIndex: 0,
  }));
  const resetChanged = pagination.resetState !== resetState;
  const pageIndex = resetChanged
    ? 0
    : Math.min(pagination.pageIndex, lastPageIndex);

  if (resetChanged || pagination.pageCount !== pageCount) {
    setPagination({ resetState, pageCount, pageIndex });
  }

  const setPageIndex = useCallback(
    (nextPageIndex: number) => {
      setPagination({
        resetState,
        pageCount,
        pageIndex: Math.min(Math.max(nextPageIndex, 0), lastPageIndex),
      });
    },
    [lastPageIndex, pageCount, resetState],
  );

  const pageItems = useMemo(
    () =>
      items.slice(
        pageIndex * LIMIT_LIST_PAGE_SIZE,
        (pageIndex + 1) * LIMIT_LIST_PAGE_SIZE,
      ),
    [items, pageIndex],
  );

  return {
    pageItems,
    pageIndex,
    pageCount,
    setPageIndex,
  };
}

export function LimitListPagination({
  label,
  totalItems,
  pageIndex,
  pageCount,
  hasMore,
  onPageChange,
}: {
  label: string;
  totalItems: number;
  pageIndex: number;
  pageCount: number;
  hasMore?: boolean;
  onPageChange: (pageIndex: number) => void;
}) {
  if (pageCount <= 1) return null;

  const firstItem = pageIndex * LIMIT_LIST_PAGE_SIZE + 1;
  const lastItem = Math.min((pageIndex + 1) * LIMIT_LIST_PAGE_SIZE, totalItems);
  const isFirstPage = pageIndex === 0;
  const isLastPage = pageIndex === pageCount - 1;

  return (
    <div className="flex w-full flex-row-reverse flex-wrap items-center gap-2 pt-3 pr-4 pb-2 pl-2 text-center text-xs text-gray-500/80">
      <div className="ml-auto">
        <span className="font-medium text-gray-500 tabular-nums">
          {formatNumber(firstItem)}–{formatNumber(lastItem)}
        </span>{' '}
        shown of{' '}
        <span className="font-medium text-gray-500 tabular-nums">
          {formatNumber(totalItems)}
          {hasMore ? '+' : ''}
        </span>{' '}
        {label}
      </div>
      <nav
        aria-label={`${label} pagination`}
        className="flex items-center rounded-lg border bg-zinc-50 py-0.5 shadow-xs"
      >
        <Button
          type="button"
          variant="icon"
          aria-label={`First page of ${label}`}
          disabled={isFirstPage}
          onClick={() => onPageChange(0)}
        >
          <Icon name={IconName.ChevronFirst} className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="icon"
          aria-label={`Previous page of ${label}`}
          disabled={isFirstPage}
          onClick={() => onPageChange(pageIndex - 1)}
        >
          <Icon name={IconName.ChevronLeft} className="h-4 w-4" />
        </Button>
        <div
          aria-live="polite"
          className="mx-2 flex items-center gap-0.5 text-0.5xs"
        >
          {pageIndex + 1} / {pageCount}
        </div>
        <Button
          type="button"
          variant="icon"
          aria-label={`Next page of ${label}`}
          disabled={isLastPage}
          onClick={() => onPageChange(pageIndex + 1)}
        >
          <Icon name={IconName.ChevronRight} className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="icon"
          aria-label={`Last page of ${label}`}
          disabled={isLastPage}
          onClick={() => onPageChange(pageCount - 1)}
        >
          <Icon name={IconName.ChevronLast} className="h-4 w-4" />
        </Button>
      </nav>
    </div>
  );
}
