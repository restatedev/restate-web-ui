import { Cell } from '@restate/ui-table';
import { formatNumber } from '@restate/util-intl';
import { tv } from '@restate/util-styles';
import type { PropsWithChildren } from 'react';

const styles = tv({
  slots: {
    cell: 'p-0!',
    content:
      'grid h-full w-full min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2 py-2 pr-3 pl-2',
    count:
      'inline-flex items-center justify-self-start rounded-md bg-tint-subtle px-1.5 py-0.5 text-xs font-medium text-muted tabular-nums',
    bar: 'w-full max-w-28 min-w-0 justify-self-end',
  },
});

export function NotCompletedInvocationsCell({
  label,
  count,
  isLoading,
  isError,
  children,
}: PropsWithChildren<{
  label: string;
  count: number;
  isLoading: boolean;
  isError: boolean;
}>) {
  const { cell, content, count: countStyles, bar } = styles();
  return (
    <Cell className={cell()}>
      <div
        aria-label={`${formatNumber(count)} not-completed invocations for ${label}`}
        className={content()}
      >
        {isLoading ? (
          <span className="h-5 w-12 animate-pulse rounded-full bg-emphasis/70" />
        ) : (
          <span className={countStyles()}>
            {isError ? '—' : formatNumber(count, true)}
          </span>
        )}
        <div className={bar()}>{children}</div>
      </div>
    </Cell>
  );
}
