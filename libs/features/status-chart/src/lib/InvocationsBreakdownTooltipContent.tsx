import type { ReactNode } from 'react';
import {
  formatNumber,
  formatPlurals,
  formatPercentageWithoutFraction,
} from '@restate/util/intl';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';
import type { IssueSeverity } from '@restate/features/system-health';
import { issueAlertIconStyles } from '@restate/ui/issue-banner';
import {
  STATUS_ORDER,
  STATUS_STYLE,
  STATUS_LABELS,
  DEFAULT_STYLE,
} from './constants';

export type StatusBarEntry = {
  name: string;
  count: number;
} & (typeof STATUS_STYLE)[string];

export function buildStatusEntries(
  rows: { status: string; count: number }[],
): StatusBarEntry[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.count <= 0) continue;
    map.set(row.status, (map.get(row.status) ?? 0) + row.count);
  }
  return STATUS_ORDER.filter((name) => (map.get(name) ?? 0) > 0).map(
    (name) => ({
      name,
      count: map.get(name) ?? 0,
      ...(STATUS_STYLE[name] ?? DEFAULT_STYLE),
    }),
  );
}

export function InvocationsBreakdownTooltipContent({
  title,
  total,
  totalLink,
  statuses,
  getStatusLink,
  issuesByStatus,
}: {
  title: ReactNode;
  total: number;
  totalLink: string;
  statuses: StatusBarEntry[];
  getStatusLink: (statusName: string) => string;
  issuesByStatus?: Map<string, IssueSeverity>;
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-2">
        <div className="">{title}</div>
        <Link
          href={totalLink}
          variant="secondary"
          className="-mx-2 flex items-baseline gap-1 rounded-lg border-none bg-transparent px-2 py-1 !text-inherit no-underline shadow-none hover:bg-white/10"
        >
          <span className="!text-xl !text-gray-50">
            {formatNumber(total, true)}
          </span>
          <span className="!text-sm !text-gray-400">
            {formatPlurals(total, { one: 'invocation', other: 'invocations' })}
          </span>
          <Icon
            name={IconName.ChevronRight}
            className="ml-auto h-3.5 w-3.5 shrink-0 !text-zinc-500"
          />
        </Link>
      </div>
      <div className="-mx-3 border-t border-white/10" />
      <div className="mt-2 flex flex-col">
        {statuses.map((s) => {
          const severity = issuesByStatus?.get(s.name);
          return (
            <Link
              key={s.name}
              href={getStatusLink(s.name)}
              variant="secondary"
              className="-mx-2 flex items-center gap-2.5 rounded-lg border-none bg-transparent px-2 py-1.5 !text-inherit no-underline shadow-none hover:bg-white/10"
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
                {STATUS_LABELS[s.name] ?? s.name}
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                {severity && (
                  <Icon
                    name={IconName.TriangleAlert}
                    className={issueAlertIconStyles({ severity })}
                  />
                )}
              </span>
              <span className="!text-0.5xs font-semibold !text-gray-100 tabular-nums">
                {formatNumber(s.count, true)}
              </span>
              <span className="!text-0.5xs font-medium !text-gray-300">
                ({formatPercentageWithoutFraction(s.count / total)})
              </span>
              <Icon
                name={IconName.ChevronRight}
                className="h-3 w-3 shrink-0 !text-zinc-500"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
