import type { ReactNode } from 'react';
import {
  formatNumber,
  formatPlurals,
  formatPercentageWithoutFraction,
  formatApproxPercentage,
} from '@restate/util/intl';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';
import type { IssueSeverity } from '@restate/features/system-health';
import { issueAlertIconStyles } from '@restate/ui/issue-banner';
import { tv } from '@restate/util/styles';
import {
  STATUS_ORDER,
  STATUS_STYLE,
  STATUS_LABELS,
  DEFAULT_STYLE,
} from './constants';

export type StatusBarEntry = {
  name: string;
  label?: string;
  count: number;
} & (typeof STATUS_STYLE)[string];

const totalItemStyles = tv({
  base: '-mx-2 flex items-baseline gap-1 rounded-lg border-none bg-transparent px-2 py-1 !text-inherit no-underline shadow-none',
  variants: {
    linked: { true: 'hover:bg-white/10' },
  },
});

const statusItemStyles = tv({
  base: '-mx-2 flex items-center gap-2.5 rounded-lg border-none bg-transparent px-2 py-1.5 !text-inherit no-underline shadow-none transition',
  variants: {
    linked: { true: 'hover:bg-white/10' },
    dimmed: { true: 'opacity-40 saturate-50' },
  },
});

function TooltipItem({
  href,
  className,
  children,
}: {
  href?: string;
  className: string;
  children: ReactNode;
}) {
  return href ? (
    <Link href={href} variant="secondary" className={className}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

export function buildStatusEntries(
  rows: { status: string; label?: string; count: number }[],
): StatusBarEntry[] {
  const map = new Map<string, number>();
  const labels = new Map<string, string>();
  for (const row of rows) {
    if (row.count <= 0) continue;
    map.set(row.status, (map.get(row.status) ?? 0) + row.count);
    if (row.label) labels.set(row.status, row.label);
  }
  return STATUS_ORDER.filter((name) => (map.get(name) ?? 0) > 0).map(
    (name) => ({
      name,
      label: labels.get(name),
      count: map.get(name) ?? 0,
      ...(STATUS_STYLE[name] ?? DEFAULT_STYLE),
    }),
  );
}

export function InvocationsBreakdownTooltipContent({
  title,
  total,
  filteredTotal,
  totalLink,
  statuses,
  getStatusLink,
  issuesByStatus,
  isStatusDimmed,
  isSampled,
  noun = { one: 'invocation', other: 'invocations' },
}: {
  title: ReactNode;
  noun?: { one: string; other: string };
  // Total in the current scope (denominator for percentages). When a status
  // filter is also active, pass `filteredTotal` to show it alongside as
  // `filtered/total`.
  total: number;
  filteredTotal?: number;
  totalLink?: string;
  statuses: StatusBarEntry[];
  getStatusLink?: (statusName: string) => string | undefined;
  issuesByStatus?: Map<string, IssueSeverity>;
  // Fade rows whose status doesn't pass the current status filter — mirrors
  // the bar's dimming so the tooltip stays in sync.
  isStatusDimmed?: (statusName: string) => boolean;
  // Counts come from a sampled summary — render percentages instead of raw
  // numbers and label the totals row as a sample-based estimate.
  isSampled?: boolean;
}) {
  const showFiltered = filteredTotal !== undefined && filteredTotal !== total;
  const filteredShare =
    showFiltered && total > 0
      ? formatApproxPercentage(filteredTotal / total)
      : null;
  return (
    <div className="flex flex-col">
      <div className="mb-2">
        <div className="">{title}</div>
        <TooltipItem
          href={totalLink}
          className={totalItemStyles({ linked: Boolean(totalLink) })}
        >
          {isSampled ? (
            total === 0 ? (
              <>
                <span className="!text-xl !text-gray-50">No</span>
                <span className="!text-sm !text-gray-400">{noun.other}</span>
              </>
            ) : (
              <>
                <span className="!text-xl !text-gray-50">
                  {filteredShare ?? 'All'}
                </span>
                <span className="!text-sm !text-gray-400">
                  {filteredShare ? `of ${noun.other}` : noun.other}
                </span>
              </>
            )
          ) : (
            <>
              <span className="!text-xl !text-gray-50">
                {formatNumber(showFiltered ? filteredTotal : total, true)}
              </span>
              {showFiltered && (
                <span className="!text-sm !text-gray-500">
                  /{formatNumber(total, true)}
                </span>
              )}
              <span className="!text-sm !text-gray-400">
                {formatPlurals(showFiltered ? filteredTotal : total, noun)}
              </span>
            </>
          )}
          {totalLink && (
            <Icon
              name={IconName.ChevronRight}
              className="ml-auto h-3.5 w-3.5 shrink-0 !text-zinc-500"
            />
          )}
        </TooltipItem>
      </div>
      {statuses.length > 0 && (
        <div className="-mx-3 border-t border-white/10" />
      )}
      <div className="mt-2 flex flex-col empty:mt-0">
        {statuses.map((s) => {
          const severity = issuesByStatus?.get(s.name);
          const dimmed = isStatusDimmed?.(s.name) ?? false;
          const percentage =
            total > 0 ? formatPercentageWithoutFraction(s.count / total) : '0%';
          const statusLink = getStatusLink?.(s.name);
          return (
            <TooltipItem
              key={s.name}
              href={statusLink}
              className={statusItemStyles({
                linked: Boolean(statusLink),
                dimmed,
              })}
            >
              <div
                className="h-3.5 w-3.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: s.fillLight,
                  border: `1.5px solid ${s.stroke}`,
                  boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.35)',
                }}
              />
              <span className="pr-2 !text-0.5xs !text-gray-300">
                {s.label ?? STATUS_LABELS[s.name] ?? s.name}
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                {severity && (
                  <Icon
                    name={IconName.TriangleAlert}
                    className={issueAlertIconStyles({ severity })}
                  />
                )}
              </span>
              {isSampled ? (
                <span className="!text-0.5xs font-semibold !text-gray-100 tabular-nums">
                  {formatApproxPercentage(s.count / total)}
                </span>
              ) : (
                <>
                  <span className="!text-0.5xs font-semibold !text-gray-100 tabular-nums">
                    {formatNumber(s.count, true)}
                  </span>
                  <span className="!text-0.5xs font-medium !text-gray-300">
                    ({percentage})
                  </span>
                </>
              )}
              {statusLink && (
                <Icon
                  name={IconName.ChevronRight}
                  className="h-3 w-3 shrink-0 !text-zinc-500"
                />
              )}
            </TooltipItem>
          );
        })}
      </div>
      {isSampled && statuses.length > 0 && (
        <div className="-mx-3 mt-2 border-t border-white/10" />
      )}
      {isSampled && (
        <div className="mt-2 !text-2xs !text-gray-400">
          Estimated from a sample.
        </div>
      )}
    </div>
  );
}
