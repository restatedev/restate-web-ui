import { client, useAdminBaseUrl } from '@restate/data-access/admin-api';
import {
  clearQueryStats,
  getQueryStatsSnapshot,
  subscribeToQueryStats,
  type QueryPageStat,
  type QueryStat,
} from '@restate/data-access/query';
import { Badge } from '@restate/ui/badge';
import { Button } from '@restate/ui/button';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui/content-panel';
import { Copy } from '@restate/ui/copy';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from '@restate/ui/dialog';
import { EmptyState } from '@restate/ui/empty-state';
import { ErrorBanner } from '@restate/ui/error';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui/table';
import {
  HoverTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TruncateWithTooltip,
} from '@restate/ui/tooltip';
import {
  formatDurations,
  formatNumber,
  normaliseDuration,
} from '@restate/util/intl';
import { useMutation } from '@tanstack/react-query';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { Input, TextField, type SortDescriptor } from 'react-aria-components';
import { formatPageLabel } from './pageLabels';
import { formatSql, SqlText } from './sqlDisplay';

type StatsColumn =
  | 'query'
  | 'pages'
  | 'count'
  | 'p50'
  | 'p90'
  | 'max'
  | 'timeouts'
  | 'lastExecuted'
  | 'actions';

const STATS_COLUMNS: PanelTableColumn<StatsColumn>[] = [
  {
    id: 'query',
    name: 'Query',
    isRowHeader: true,
    allowsSorting: true,
    defaultWidth: '5fr',
    minWidth: 280,
  },
  { id: 'pages', name: 'Pages', defaultWidth: '2fr', minWidth: 160 },
  {
    id: 'count',
    name: 'Count',
    allowsSorting: true,
    preferredSortDirection: 'descending',
    width: 80,
  },
  {
    id: 'p50',
    name: 'p50',
    allowsSorting: true,
    preferredSortDirection: 'descending',
    width: 80,
  },
  {
    id: 'p90',
    name: 'p90',
    allowsSorting: true,
    preferredSortDirection: 'descending',
    width: 80,
  },
  {
    id: 'max',
    name: 'Max',
    allowsSorting: true,
    preferredSortDirection: 'descending',
    width: 100,
  },
  {
    id: 'timeouts',
    name: 'Timeouts',
    allowsSorting: true,
    preferredSortDirection: 'descending',
    width: 90,
  },
  {
    id: 'lastExecuted',
    name: 'Last run',
    allowsSorting: true,
    preferredSortDirection: 'descending',
    width: 100,
  },
  { id: 'actions', name: 'Actions', hideLabel: true, width: 130 },
];

function compareStats(a: QueryStat, b: QueryStat, column: StatsColumn): number {
  switch (column) {
    case 'count':
      return a.count - b.count;
    case 'p50':
      return (a.p50 ?? -1) - (b.p50 ?? -1);
    case 'p90':
      return (a.p90 ?? -1) - (b.p90 ?? -1);
    case 'max':
      return (a.max?.durationMs ?? -1) - (b.max?.durationMs ?? -1);
    case 'timeouts':
      return a.timeouts - b.timeouts;
    case 'lastExecuted':
      return a.lastExecutedAt - b.lastExecutedAt;
    default:
      return a.description.localeCompare(b.description);
  }
}

// The dashed underline marks cells whose hover reveals the full statement,
// matching the app's inline-tooltip indicator treatment.
const HOVER_INDICATOR_CLASS =
  'cursor-help underline decoration-dashed decoration-from-font underline-offset-4';

const MAX_TABLE_ROWS = 50;

// A one-line skeleton of the full shape: the tables plus the clauses that
// drive performance. Cheap point lookups (id = ?, id IN (…)) are spelled out
// so they are recognizable at a glance; the full shape is shown on hover.
function compactShape(stat: QueryStat): string {
  const clauses: string[] = [];
  const pointLookup = stat.shape.match(
    /WHERE\s+(?:\w+\.)?(\w+)\s+(?:(=)\s*\?|(IN)\s*\((?:…|≤\d[^)]*)\))/,
  );
  if (pointLookup) {
    const [, column, equals] = pointLookup;
    const predicate = equals ? `${column} = ?` : `${column} IN (…)`;
    const hasMoreConditions = stat.shape.includes(' AND ');
    clauses.push(`WHERE ${predicate}${hasMoreConditions ? ' …' : ''}`);
  } else if (stat.shape.includes('WHERE')) {
    clauses.push('WHERE …');
  }
  if (stat.shape.includes('GROUP BY')) {
    clauses.push('GROUP BY …');
  }
  if (stat.shape.includes('ORDER BY')) {
    clauses.push('ORDER BY …');
  }
  // The sampled-mode variant carries its own inner LIMIT; ignore it so the
  // compact line reports the statement's outer bound.
  const withoutSampledVariant = stat.shape.replaceAll(/\[sampled:[^\]]*\]/g, '');
  const limits = [...withoutSampledVariant.matchAll(/LIMIT\s+(≤?\s?[\d,]+)/g)];
  const limit = limits.at(-1)?.[1];
  if (limit) {
    clauses.push(`LIMIT ${limit}`);
  }
  return `SELECT … FROM ${stat.tables.join(', ')}${
    clauses.length > 0 ? ` ${clauses.join(' ')}` : ''
  }`;
}

function matchesSearch(stat: QueryStat, search: string): boolean {
  if (!search) return true;
  const haystack = [
    stat.id,
    stat.description,
    stat.shape,
    stat.tables.join(' '),
    stat.pages.map(({ page }) => `${page} ${formatPageLabel(page)}`).join(' '),
    stat.max?.sql ?? '',
  ]
    .join('\n')
    .toLowerCase();
  return search
    .toLowerCase()
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}

function formatMs(value: number | null | undefined): string {
  if (value === null || value === undefined) return '–';
  return formatDurations(
    normaliseDuration({ milliseconds: Math.round(value) }),
  );
}

function formatAgo(now: number, timestamp: number): string {
  const elapsed = now - timestamp;
  if (elapsed < 1000) return 'just now';
  const duration = formatDurations(
    normaliseDuration({ seconds: Math.floor(elapsed / 1000) }),
  );
  return `${duration} ago`;
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function fileTimestamp() {
  return new Date().toISOString().replaceAll(':', '-');
}

function explainFileContent(
  stat: QueryStat,
  rows: Record<string, unknown>[],
): string {
  const { max } = stat;
  return [
    `-- EXPLAIN ANALYZE: ${stat.id}`,
    `-- ${stat.description}`,
    ...(max
      ? [
          `-- Slowest recorded execution: ${Math.round(max.durationMs)}ms${
            max.timedOut ? ' (timed out)' : ''
          } on ${max.page ?? 'unknown page'} at ${new Date(
            max.executedAt,
          ).toISOString()}`,
        ]
      : []),
    '',
    '-- SQL',
    max ? formatSql(max.sql) : '',
    '',
    '-- Plan',
    ...rows.map((row) => {
      const planType = row['plan_type'];
      const plan = row['plan'];
      return [
        planType !== undefined ? `-- ${String(planType)}` : undefined,
        plan !== undefined ? String(plan) : JSON.stringify(row),
      ]
        .filter(Boolean)
        .join('\n');
    }),
  ].join('\n');
}

function useExplainAnalyze() {
  const baseUrl = useAdminBaseUrl();
  return useMutation({
    mutationFn: async (stat: QueryStat) => {
      if (!stat.max) {
        throw new Error('No recorded execution to explain.');
      }
      const { data } = await client.POST('/query', {
        baseUrl,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: { query: `EXPLAIN ANALYZE ${stat.max.sql}` },
      });
      return (data ?? { rows: [] }) as { rows?: Record<string, unknown>[] };
    },
    onSuccess: (data, stat) => {
      downloadTextFile(
        `explain-analyze-${stat.id.replaceAll('/', '-')}-${fileTimestamp()}.txt`,
        explainFileContent(stat, data.rows ?? []),
        'text/plain',
      );
    },
  });
}

function ExplainAnalyzeButton({
  stat,
  explain,
  className,
}: {
  stat: QueryStat;
  explain: ReturnType<typeof useExplainAnalyze>;
  className?: string;
}) {
  const isRunning = explain.isPending && explain.variables?.id === stat.id;
  return (
    <Tooltip>
      <TooltipTrigger>
        <Button
          variant="secondary"
          disabled={!stat.max || explain.isPending}
          onClick={() => explain.mutate(stat)}
          className={className}
        >
          {isRunning ? 'Running…' : 'Explain analyze'}
        </Button>
      </TooltipTrigger>
      <TooltipContent size="sm">
        Re-runs the slowest recorded execution with EXPLAIN ANALYZE and
        downloads the plan.
      </TooltipContent>
    </Tooltip>
  );
}

function PageLink({
  page,
  className,
}: {
  page: Pick<QueryPageStat, 'page' | 'href'> & { count?: number };
  className?: string;
}) {
  const label = `${formatPageLabel(page.page)}${
    page.count !== undefined ? ` (${formatNumber(page.count)})` : ''
  }`;
  if (!page.href) {
    return <span className={className}>{label}</span>;
  }
  return (
    <Link href={page.href} variant="secondary" className={className}>
      {label}
    </Link>
  );
}

function QueryDetailsDialog({
  stat,
  explain,
  onOpenChange,
}: {
  stat: QueryStat;
  explain: ReturnType<typeof useExplainAnalyze>;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-xs">
              <Icon name={IconName.Gauge} className="h-5 w-5 text-blue-500" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                {stat.description}
                {stat.deprecated && (
                  <Badge size="sm" variant="warning">
                    Deprecated
                  </Badge>
                )}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 text-sm sm:grid-cols-3">
            {[
              { label: 'Count', value: formatNumber(stat.count) },
              { label: 'p50', value: formatMs(stat.p50) },
              { label: 'p90', value: formatMs(stat.p90) },
              { label: 'Max', value: formatMs(stat.max?.durationMs) },
              { label: 'Timeouts', value: formatNumber(stat.timeouts) },
              {
                label: 'Errors / aborted',
                value: `${formatNumber(stat.errors)} / ${formatNumber(stat.aborted)}`,
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col">
                <span className="text-2xs text-gray-500">{label}</span>
                <span className="font-medium text-gray-800 tabular-nums">
                  {value}
                </span>
              </div>
            ))}
            <div className="col-span-full flex flex-col">
              <span className="text-2xs text-gray-500">Source tables</span>
              <span className="flex flex-wrap gap-1 pt-0.5">
                {stat.tables.map((table) => (
                  <Badge key={table} size="sm" className="font-mono">
                    {table}
                  </Badge>
                ))}
              </span>
            </div>
            <div className="col-span-full flex flex-col">
              <span className="text-2xs text-gray-500">Shape</span>
              <span className="font-mono text-xs break-words whitespace-pre-wrap text-gray-700">
                <SqlText
                  sql={formatSql(stat.shape)}
                  tables={stat.tables}
                  surface="light"
                />
              </span>
            </div>
            <div className="col-span-full flex flex-col">
              <span className="text-2xs text-gray-500">Pages</span>
              <span className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5 text-xs">
                {stat.pages.map((page) => (
                  <PageLink key={page.page} page={page} />
                ))}
              </span>
            </div>
          </div>

          {stat.max && (
            <div className="flex min-h-0 flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Slowest execution
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  {formatMs(stat.max.durationMs)}
                  {stat.max.timedOut ? ' · timed out' : ''} ·{' '}
                  {stat.max.page ? (
                    <PageLink
                      page={{ page: stat.max.page, href: stat.max.pageHref }}
                    />
                  ) : (
                    'unknown page'
                  )}{' '}
                  · {new Date(stat.max.executedAt).toLocaleString()}
                </span>
                <Copy copyText={stat.max.sql} className="-my-2" />
              </div>
              <pre className="max-h-72 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-3 font-mono text-xs whitespace-pre-wrap text-gray-800">
                <SqlText
                  sql={formatSql(stat.max.sql)}
                  tables={stat.tables}
                  surface="light"
                />
              </pre>
            </div>
          )}

          <DialogFooter>
            <div className="flex flex-col gap-2">
              {explain.error ? (
                <ErrorBanner error={explain.error as Error} />
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <DialogClose>
                  <Button type="button" variant="secondary">
                    Close
                  </Button>
                </DialogClose>
                <Button
                  variant="primary"
                  disabled={!stat.max || explain.isPending}
                  onClick={() => explain.mutate(stat)}
                >
                  {explain.isPending && explain.variables?.id === stat.id
                    ? 'Running…'
                    : 'Explain analyze'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function renderStatsCell(
  stat: QueryStat,
  column: PanelTableColumn<StatsColumn>,
  now: number,
  explain: ReturnType<typeof useExplainAnalyze>,
) {
  switch (column.id) {
    case 'query':
      return (
        <Cell>
          <div className="flex min-w-0 flex-col">
            <span className="min-w-0 font-mono text-xs text-gray-700">
              <TruncateWithTooltip
                alwaysShow
                size="lg"
                copyText={stat.shape}
                containerClassName={HOVER_INDICATOR_CLASS}
                tooltipContent={
                  <span className="font-mono">
                    <SqlText
                      sql={formatSql(stat.shape)}
                      tables={stat.tables}
                      surface="dark"
                    />
                  </span>
                }
              >
                <SqlText
                  sql={compactShape(stat)}
                  tables={stat.tables}
                  surface="neutral"
                />
              </TruncateWithTooltip>
            </span>
            <span className="flex min-w-0 items-center gap-1.5 text-2xs text-gray-400">
              <TruncateWithTooltip hideCopy tooltipContent={stat.description}>
                {stat.description}
              </TruncateWithTooltip>
              {stat.deprecated && (
                <Badge size="sm" variant="warning" className="shrink-0">
                  Deprecated
                </Badge>
              )}
            </span>
          </div>
        </Cell>
      );
    case 'pages': {
      const visible = stat.pages.slice(0, 2);
      const rest = stat.pages.slice(2);
      return (
        <Cell>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            {visible.map((page) => (
              <PageLink
                key={page.page}
                page={{ page: page.page, href: page.href }}
                className="whitespace-nowrap"
              />
            ))}
            {rest.length > 0 && (
              <HoverTooltip
                content={
                  <span className="block max-w-md text-xs">
                    {rest
                      .map(
                        (page) =>
                          `${formatPageLabel(page.page)} (${formatNumber(page.count)})`,
                      )
                      .join(', ')}
                  </span>
                }
              >
                <span className="shrink-0 text-gray-400">+{rest.length}</span>
              </HoverTooltip>
            )}
          </div>
        </Cell>
      );
    }
    case 'count':
      return (
        <Cell>
          <span className="tabular-nums">{formatNumber(stat.count)}</span>
        </Cell>
      );
    case 'p50':
      return (
        <Cell>
          <span className="tabular-nums">{formatMs(stat.p50)}</span>
        </Cell>
      );
    case 'p90':
      return (
        <Cell>
          <span className="tabular-nums">{formatMs(stat.p90)}</span>
        </Cell>
      );
    case 'max':
      return (
        <Cell>
          <span className="flex min-w-0 items-center gap-1 tabular-nums">
            {stat.max ? (
              <TruncateWithTooltip
                alwaysShow
                size="lg"
                copyText={stat.max.sql}
                containerClassName={HOVER_INDICATOR_CLASS}
                tooltipContent={
                  <span className="font-mono">
                    <SqlText
                      sql={formatSql(stat.max.sql)}
                      tables={stat.tables}
                      surface="dark"
                    />
                  </span>
                }
              >
                {formatMs(stat.max.durationMs)}
              </TruncateWithTooltip>
            ) : (
              formatMs(stat.max)
            )}
            {stat.max?.timedOut && (
              <Icon
                name={IconName.TriangleAlert}
                className="h-3 w-3 shrink-0 text-amber-500"
              />
            )}
          </span>
        </Cell>
      );
    case 'timeouts':
      return (
        <Cell>
          <span
            className={
              stat.timeouts > 0
                ? 'font-medium text-amber-700 tabular-nums'
                : 'text-zinc-300 tabular-nums'
            }
          >
            {formatNumber(stat.timeouts)}
          </span>
        </Cell>
      );
    case 'lastExecuted':
      return (
        <Cell>
          <span
            className="text-xs whitespace-nowrap text-gray-500"
            title={new Date(stat.lastExecutedAt).toLocaleString()}
          >
            {formatAgo(now, stat.lastExecutedAt)}
          </span>
        </Cell>
      );
    case 'actions':
      return (
        <Cell className="[&&&]:overflow-visible">
          <div className="flex justify-end">
            <ExplainAnalyzeButton
              stat={stat}
              explain={explain}
              className="flex items-center rounded-lg px-2 py-0.5 text-0.5xs whitespace-nowrap text-gray-600"
            />
          </div>
        </Cell>
      );
  }
}

function Component() {
  const stats = useSyncExternalStore(
    subscribeToQueryStats,
    getQueryStatsSnapshot,
    getQueryStatsSnapshot,
  );
  const [search, setSearch] = useState('');
  const [sortDescriptor, setSortDescriptor] = useState<
    SortDescriptor | undefined
  >({ column: 'max', direction: 'descending' });
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const explain = useExplainAnalyze();

  useEffect(() => {
    if (stats.length === 0) return;
    const interval = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(interval);
  }, [stats.length]);

  const rows = useMemo(() => {
    const filtered = stats.filter((stat) => matchesSearch(stat, search));
    if (!sortDescriptor) return filtered;
    const column = sortDescriptor.column as StatsColumn;
    const direction = sortDescriptor.direction === 'ascending' ? 1 : -1;
    return [...filtered].sort(
      (a, b) =>
        compareStats(a, b, column) * direction || a.id.localeCompare(b.id),
    );
  }, [stats, search, sortDescriptor]);
  const visibleRows = useMemo(() => rows.slice(0, MAX_TABLE_ROWS), [rows]);

  const exportStats = useCallback(() => {
    downloadTextFile(
      `query-stats-${fileTimestamp()}.json`,
      JSON.stringify(
        { exportedAt: new Date().toISOString(), queries: stats },
        null,
        2,
      ),
      'application/json',
    );
  }, [stats]);

  const detailsStat = detailsId
    ? stats.find((stat) => stat.id === detailsId)
    : undefined;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 px-1 pt-2 pb-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-white shadow-xs">
          <Icon name={IconName.Gauge} className="h-5 w-5 text-gray-500" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold text-gray-800">Query stats</h1>
          <p className="text-sm text-gray-500">
            Every SQL query the UI ran, aggregated per statement. Stats are
            stored in this browser for a day, survive reloads, and merge across
            open tabs.
          </p>
        </div>
      </div>
      <ContentPanel>
        <ContentPanelToolbar>
          <TextField
            aria-label="Search queries"
            value={search}
            onChange={setSearch}
            className="hidden min-w-0 flex-auto justify-end sm:flex"
          >
            <div className="flex h-7 w-full max-w-[38ch] items-center gap-1.5 rounded-lg border bg-white/70 px-2 shadow-xs hover:bg-white">
              <Icon
                name={IconName.Search}
                className="h-4 w-4 shrink-0 text-gray-400"
              />
              <Input
                placeholder="Search queries…"
                className="min-w-0 flex-1 bg-transparent text-0.5xs outline-none placeholder:text-gray-500/75"
              />
            </div>
          </TextField>
          <span className="shrink-0 text-0.5xs text-gray-500 tabular-nums">
            {formatNumber(rows.length)} of {formatNumber(stats.length)} queries
          </span>
          <Tooltip>
            <TooltipTrigger>
              <Button
                type="button"
                variant="icon"
                aria-label="Download all query stats as JSON"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg p-0"
                onClick={exportStats}
                disabled={stats.length === 0}
              >
                <Icon name={IconName.Download} className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent size="sm">Download as JSON</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <Button
                type="button"
                variant="icon"
                aria-label="Clear recorded query stats"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg p-0"
                onClick={() => clearQueryStats()}
                disabled={stats.length === 0}
              >
                <Icon name={IconName.Trash} className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent size="sm">Clear recorded stats</TooltipContent>
          </Tooltip>
        </ContentPanelToolbar>
        <ContentPanelBody className="pb-32">
          <ContentPanelSection flush>
            {explain.error ? (
              <div className="px-2 pt-2">
                <ErrorBanner error={explain.error as Error} />
              </div>
            ) : null}
            <PanelTable
              aria-label="Query stats"
              columns={STATS_COLUMNS}
              items={visibleRows}
              numOfRows={Math.max(visibleRows.length, 6)}
              sortDescriptor={sortDescriptor}
              onSortChange={setSortDescriptor}
              bodyDependencies={[now, explain.isPending, explain.variables?.id]}
              emptyPlaceholder={
                <EmptyState
                  icon={IconName.Gauge}
                  title={
                    stats.length === 0
                      ? 'No queries recorded yet'
                      : 'No matching queries'
                  }
                  description={
                    stats.length === 0
                      ? 'Browse the UI and every SQL query it runs will show up here with duration percentiles.'
                      : 'No recorded query matches the current search.'
                  }
                />
              }
              renderCell={(stat, column) =>
                renderStatsCell(stat, column, now, explain)
              }
              onRowAction={(key) => setDetailsId(String(key))}
              rowClassName="transition-none [content-visibility:auto]"
            />
          </ContentPanelSection>
        </ContentPanelBody>
      </ContentPanel>
      {detailsStat && (
        <QueryDetailsDialog
          stat={detailsStat}
          explain={explain}
          onOpenChange={(open) => {
            if (!open) setDetailsId(null);
          }}
        />
      )}
    </div>
  );
}

export const queryStats = { Component };
