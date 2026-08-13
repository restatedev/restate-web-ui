import type { UserLimitRow } from '@restate/data-access/admin-api-hooks';
import {
  LimitCounterTarget,
  LimitRuleTarget,
} from '@restate/features/vqueue-ui';
import { Badge } from '@restate/ui/badge';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui/table';
import { HoverTooltip, InlineTooltip } from '@restate/ui/tooltip';
import {
  formatNumber,
  formatPercentageWithoutFraction,
} from '@restate/util/intl';
import { tv } from '@restate/util/styles';
import { useMemo, type ReactNode } from 'react';
import type { SortDescriptor } from 'react-aria-components';
import { useNavigate } from 'react-router';
import {
  limitCountersForRuleHref,
  type LimitCounterIdentity,
  vqueuesForLimitCounterHref,
} from './navigation';
import type { RuleLevel } from './pattern';
import { getCounterUsageRatio } from './counterUsage';
import { LimitValue } from './LimitValue';
import {
  RULE_LEVEL_COLUMN_WIDTH,
  RuleLevelExplainer,
  RuleLevelValue,
} from './RuleLevel';

type CounterColumn =
  | 'counter'
  | 'level'
  | 'limit'
  | 'usage'
  | 'waiting'
  | 'pattern';

interface CounterRow extends UserLimitRow {
  id: string;
  identity?: LimitCounterIdentity;
  ruleHref?: string;
  resolvedLevel: RuleLevel;
}

const RULE_COUNTER_COLUMNS: PanelTableColumn<CounterColumn>[] = [
  {
    id: 'counter',
    name: 'Limit counter',
    isRowHeader: true,
    defaultWidth: '3fr',
  },
  {
    id: 'usage',
    name: 'Usage',
    allowsSorting: true,
    defaultWidth: '2fr',
    maxWidth: 250,
  },
  {
    id: 'waiting',
    name: <WaitingQueuesExplainer />,
    allowsSorting: true,
    defaultWidth: '1fr',
    maxWidth: 120,
  },
];

const ALL_COUNTER_COLUMNS: PanelTableColumn<CounterColumn>[] = [
  {
    id: 'counter',
    name: 'Limit counter',
    isRowHeader: true,
    defaultWidth: '3fr',
  },
  {
    id: 'usage',
    name: 'Usage',
    allowsSorting: true,
    defaultWidth: '2fr',
    maxWidth: 150,
  },
  {
    id: 'limit',
    name: 'Limit',
    defaultWidth: '2fr',
    maxWidth: 160,
  },
  {
    id: 'waiting',
    name: <WaitingQueuesExplainer />,
    allowsSorting: true,
    defaultWidth: '1fr',
    maxWidth: 120,
  },
  {
    id: 'pattern',
    name: 'Rule pattern',
    allowsSorting: true,
    defaultWidth: '3fr',
  },
  {
    id: 'level',
    name: <RuleLevelExplainer />,
    width: RULE_LEVEL_COLUMN_WIDTH,
  },
];

const capacityStyles = tv({
  slots: {
    root: 'flex w-full max-w-52 items-center gap-2 pr-2',
    track:
      'flex h-3 min-w-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 p-0.5',
    fill: 'h-full rounded-full outline-1 transition-[width]',
    value: 'shrink-0 text-right text-xs font-medium text-zinc-600 tabular-nums',
  },
  variants: {
    saturated: {
      true: { fill: 'bg-amber-200 outline-amber-300' },
      false: { fill: 'bg-blue-200 outline-blue-300' },
    },
    showLimit: {
      true: { value: 'min-w-16' },
      false: { value: 'min-w-9' },
    },
  },
});

const rowStyles = tv({
  base: 'cursor-default transition-none [content-visibility:auto]',
});

function WaitingQueuesExplainer() {
  return (
    <InlineTooltip
      variant="indicator-button"
      title="VQueues waiting for capacity"
      ariaLabel="Explain waiting VQueues"
      description={
        <p className="max-w-72 text-xs leading-4 text-zinc-300">
          VQueues enter this limit counter’s waiter set after a permit check
          fails. Each VQueue waits only at its narrowest constrained limit
          counter.
        </p>
      }
    >
      Waiting
    </InlineTooltip>
  );
}

export function counterIdentity(
  row: UserLimitRow,
): LimitCounterIdentity | undefined {
  if (!row.scope) return undefined;
  return {
    scope: row.scope,
    ...(row.l1 ? { l1: row.l1 } : {}),
    ...(row.l2 ? { l2: row.l2 } : {}),
  };
}

function counterLevel(row: UserLimitRow): RuleLevel {
  if (row.l2) return 'level2';
  if (row.l1) return 'level1';
  return 'scope';
}

function toCounterRows(
  counters: UserLimitRow[],
  baseUrl: string,
): CounterRow[] {
  return counters.map((counter) => {
    const identity = counterIdentity(counter);
    return {
      ...counter,
      id: JSON.stringify([
        counter.scope,
        counter.l1,
        counter.l2,
        counter.level,
      ]),
      resolvedLevel: counterLevel(counter),
      ...(identity ? { identity } : {}),
      ...(counter.rule_pattern
        ? {
            ruleHref: limitCountersForRuleHref(baseUrl, counter.rule_pattern),
          }
        : {}),
    };
  });
}

function CapacityCell({
  row,
  showLimit,
}: {
  row: UserLimitRow;
  showLimit: boolean;
}) {
  const usage = row.usage ?? 0;
  const limit = row.concurrency_limit;
  const ratio = getCounterUsageRatio(row);
  const percentage = Math.min((ratio ?? 0) * 100, 100);
  const saturated = limit != null && usage >= limit;
  const { root, track, fill, value } = capacityStyles({
    saturated,
    showLimit,
  });
  const label =
    limit == null
      ? `${formatNumber(usage)} in use with no limit`
      : `${formatNumber(usage)} of ${formatNumber(limit)} in use`;
  const bar = (
    <div className={track()} role="img" aria-label={label}>
      {limit != null && usage > 0 && (
        <div
          className={fill()}
          style={{ width: `${Math.max(3, percentage)}%` }}
          aria-hidden
        />
      )}
    </div>
  );

  return (
    <div className={root()}>
      <HoverTooltip content={label} className="min-w-0 flex-1">
        {bar}
      </HoverTooltip>
      {showLimit && (
        <span className={value()} aria-hidden>
          {formatNumber(usage)} <span className="text-zinc-300">/</span>{' '}
          {limit == null ? '∞' : formatNumber(limit)}
        </span>
      )}
      {!showLimit && (
        <span className={value()} aria-hidden>
          {ratio == null
            ? '—'
            : Number.isFinite(ratio)
              ? formatPercentageWithoutFraction(ratio)
              : '>100%'}
        </span>
      )}
    </div>
  );
}

function WaitingQueuesCell({ value }: { value?: number | null }) {
  const count = value ?? 0;
  if (count === 0) {
    return (
      <span className="text-xs font-medium text-zinc-300 tabular-nums">0</span>
    );
  }
  return (
    <Badge
      variant="warning"
      size="sm"
      className="min-w-7 justify-center font-semibold tabular-nums"
      aria-label={`${formatNumber(count)} waiting VQueues`}
    >
      {formatNumber(count)}
    </Badge>
  );
}

function renderCounterCell(
  row: CounterRow,
  column: PanelTableColumn<CounterColumn>,
  variant: 'rule' | 'all',
) {
  switch (column.id) {
    case 'counter':
      return (
        <Cell className="overflow-visible">
          {row.identity ? (
            <LimitCounterTarget
              {...row.identity}
              variant="table"
              usage={row.usage}
              limit={row.concurrency_limit}
            />
          ) : (
            <span className="text-zinc-400">Unknown limit counter</span>
          )}
        </Cell>
      );
    case 'level':
      return (
        <Cell>
          <RuleLevelValue level={row.resolvedLevel} />
        </Cell>
      );
    case 'limit':
      return (
        <Cell>
          <LimitValue value={row.concurrency_limit} />
        </Cell>
      );
    case 'usage':
      return (
        <Cell>
          <CapacityCell row={row} showLimit={variant === 'rule'} />
        </Cell>
      );
    case 'waiting':
      return (
        <Cell>
          <WaitingQueuesCell value={row.num_waiters} />
        </Cell>
      );
    case 'pattern':
      return (
        <Cell className="overflow-visible">
          {row.rule_pattern ? (
            <LimitRuleTarget
              pattern={row.rule_pattern}
              href={row.ruleHref}
              variant="table"
              className="w-fit"
            />
          ) : (
            <span className="text-zinc-300">—</span>
          )}
        </Cell>
      );
  }
}

export interface CounterTableProps {
  ariaLabel: string;
  counters: UserLimitRow[];
  baseUrl: string;
  variant?: 'rule' | 'all';
  isLoading?: boolean;
  error?: Error | null;
  numOfRows?: number;
  caption?: ReactNode;
  emptyPlaceholder?: ReactNode;
  dependencies?: unknown[];
  sortDescriptor: SortDescriptor;
  onSortChange: (descriptor: SortDescriptor) => void;
}

export function CounterTable({
  ariaLabel,
  counters,
  baseUrl,
  variant = 'rule',
  isLoading,
  error,
  numOfRows,
  caption,
  emptyPlaceholder,
  dependencies,
  sortDescriptor,
  onSortChange,
}: CounterTableProps) {
  const navigate = useNavigate();
  const columns =
    variant === 'all' ? ALL_COUNTER_COLUMNS : RULE_COUNTER_COLUMNS;
  const rows = useMemo(
    () => toCounterRows(counters, baseUrl),
    [baseUrl, counters],
  );
  const bodyKey = `${isLoading ? 'loading' : 'ready'}:${rows
    .map((row) => row.id)
    .join(':')}`;

  return (
    <PanelTable
      aria-label={ariaLabel}
      bodyKey={bodyKey}
      columns={columns}
      items={rows}
      isLoading={isLoading}
      error={error}
      numOfRows={numOfRows ?? Math.max(rows.length, 6)}
      sortDescriptor={sortDescriptor}
      onSortChange={onSortChange}
      bodyDependencies={[...(dependencies ?? []), error]}
      onRowAction={(key) => {
        const row = rows.find((candidate) => candidate.id === String(key));
        if (row?.identity) {
          navigate(vqueuesForLimitCounterHref(baseUrl, row.identity));
        }
      }}
      rowClassName={rowStyles()}
      caption={caption}
      emptyPlaceholder={emptyPlaceholder}
      renderCell={(row, column) => renderCounterCell(row, column, variant)}
    />
  );
}
