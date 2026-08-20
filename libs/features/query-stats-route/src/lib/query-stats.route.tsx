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
import { DropdownItem } from '@restate/ui/dropdown';
import { EmptyState } from '@restate/ui/empty-state';
import { ErrorBanner } from '@restate/ui/error';
import {
  AddFilterTrigger,
  FilterBuilder,
  FilterChip,
  type QueryClause,
  type QueryClauseSchema,
  type QueryClauseType,
  useFilterBuilder,
} from '@restate/ui/filter-builder';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { SplitButton } from '@restate/ui/split-button';
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
import { type SortDescriptor } from 'react-aria-components';
import { useHref } from 'react-router';
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
  { id: 'actions', name: 'Actions', hideLabel: true, width: 40 },
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
  const withoutSampledVariant = stat.shape.replaceAll(
    /\[sampled:[^\]]*\]/g,
    '',
  );
  const limits = [...withoutSampledVariant.matchAll(/LIMIT\s+(≤?\s?[\d,]+)/g)];
  const limit = limits.at(-1)?.[1];
  if (limit) {
    clauses.push(`LIMIT ${limit}`);
  }
  return `SELECT … FROM ${stat.tables.join(', ')}${
    clauses.length > 0 ? ` ${clauses.join(' ')}` : ''
  }`;
}

function matchesFilters(
  stat: QueryStat,
  filters: QueryClause<QueryClauseType>[],
): boolean {
  return filters.every((filter) => {
    if (!filter.isValid || !Array.isArray(filter.value.value)) return true;
    const values = filter.value.value;
    if (filter.id === 'tables') {
      return values.some((value) => stat.tables.includes(value));
    }
    if (filter.id === 'pages') {
      return values.some((value) =>
        stat.pages.some(({ page }) => page === value),
      );
    }
    return true;
  });
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

function explainAnalyzeCommand(verbose: boolean) {
  return verbose ? 'EXPLAIN ANALYZE VERBOSE' : 'EXPLAIN ANALYZE';
}

function explainFileContent(
  stat: QueryStat,
  rows: Record<string, unknown>[],
  verbose: boolean,
): string {
  const { max } = stat;
  const command = explainAnalyzeCommand(verbose);
  return [
    `-- ${command}: ${stat.id}`,
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
    max?.sql ? formatSql(max.sql) : '',
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
    mutationFn: async ({
      stat,
      verbose,
    }: {
      stat: QueryStat;
      verbose: boolean;
    }) => {
      if (!stat.max?.sql) {
        throw new Error('No recorded execution to explain.');
      }
      const command = explainAnalyzeCommand(verbose);
      const { data } = await client.POST('/query', {
        baseUrl,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: { query: `${command} ${stat.max.sql}` },
      });
      return (data ?? { rows: [] }) as { rows?: Record<string, unknown>[] };
    },
    onSuccess: (data, { stat, verbose }) => {
      downloadTextFile(
        `explain-analyze${verbose ? '-verbose' : ''}-${stat.id.replaceAll('/', '-')}-${fileTimestamp()}.txt`,
        explainFileContent(stat, data.rows ?? [], verbose),
        'text/plain',
      );
    },
  });
}

function QueryActions({
  stat,
  explain,
}: {
  stat: QueryStat;
  explain: ReturnType<typeof useExplainAnalyze>;
}) {
  const isRunning = explain.isPending && explain.variables?.stat.id === stat.id;
  const isDisabled = !stat.max?.sql || explain.isPending;
  const run = (verbose: boolean) => explain.mutate({ stat, verbose });

  return (
    <SplitButton
      mini
      className="text-0.5xs"
      onSelect={(action) => {
        if (isDisabled) return;
        run(action === 'verbose');
      }}
      menus={[
        <DropdownItem key="standard" value="standard" isDisabled={isDisabled}>
          <Icon
            name={IconName.ScanSearch}
            className="h-3.5 w-3.5 shrink-0 opacity-80"
          />
          Explain analyze
        </DropdownItem>,
        <DropdownItem key="verbose" value="verbose" isDisabled={isDisabled}>
          <Icon
            name={IconName.Code}
            className="h-3.5 w-3.5 shrink-0 opacity-80"
          />
          Explain analyze verbose
        </DropdownItem>,
      ]}
    >
      <Tooltip>
        <TooltipTrigger>
          <Button
            variant="secondary"
            disabled={isDisabled}
            onClick={() => run(false)}
            className="invisible absolute right-full z-2 flex translate-x-px items-center gap-1 rounded-l-md rounded-r-none px-2 py-0.5 text-0.5xs whitespace-nowrap text-gray-600 drop-shadow-[-20px_2px_4px_--theme(--color-gray-100/0.5)] group-hover:visible"
          >
            <Icon
              name={IconName.ScanSearch}
              className="h-[0.9em] w-[0.9em] shrink-0 opacity-80"
            />
            {isRunning ? 'Running…' : 'Explain analyze'}
          </Button>
        </TooltipTrigger>
        <TooltipContent size="sm">
          Re-runs the slowest recorded execution with EXPLAIN ANALYZE and
          downloads the plan.
        </TooltipContent>
      </Tooltip>
    </SplitButton>
  );
}

export function stripRouterBaseFromHref(
  href: string,
  routerRoot: string,
): string {
  const suffixIndex = routerRoot.search(/[?#]/);
  const routerPath =
    suffixIndex === -1 ? routerRoot : routerRoot.slice(0, suffixIndex);
  const routerBase = routerPath.replace(/\/+$/, '');
  if (!routerBase || !href.startsWith(routerBase)) {
    return href;
  }
  const suffix = href.slice(routerBase.length);
  if (suffix === '') {
    return '/';
  }
  if (
    suffix.startsWith('/') ||
    suffix.startsWith('?') ||
    suffix.startsWith('#')
  ) {
    return suffix.startsWith('/') ? suffix : `/${suffix}`;
  }
  return href;
}

function PageLink({
  page,
  className,
}: {
  page: Pick<QueryPageStat, 'page' | 'href'> & { count?: number };
  className?: string;
}) {
  const routerRoot = useHref('/');
  const label = `${formatPageLabel(page.page)}${
    page.count !== undefined ? ` (${formatNumber(page.count)})` : ''
  }`;
  if (!page.href) {
    return <span className={className}>{label}</span>;
  }
  return (
    <Link
      href={stripRouterBaseFromHref(page.href, routerRoot)}
      variant="secondary"
      className={className}
    >
      {label}
    </Link>
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
            {stat.max?.sql ? (
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
              formatMs(stat.max?.durationMs)
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
            <QueryActions stat={stat} explain={explain} />
          </div>
        </Cell>
      );
  }
}

function Component() {
  const baseUrl = useAdminBaseUrl();
  const getSnapshot = useCallback(
    () => getQueryStatsSnapshot(baseUrl),
    [baseUrl],
  );
  const stats = useSyncExternalStore(
    subscribeToQueryStats,
    getSnapshot,
    getSnapshot,
  );
  const filterSchema = useMemo(() => {
    const tables = [...new Set(stats.flatMap((stat) => stat.tables))]
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value }));
    const pages = new Map<string, string>();
    stats.forEach((stat) =>
      stat.pages.forEach(({ page }) => pages.set(page, formatPageLabel(page))),
    );
    const pageOptions = [...pages]
      .map(([value, label]) => ({ value, label }))
      .sort(
        (a, b) =>
          a.label.localeCompare(b.label) || a.value.localeCompare(b.value),
      );
    return [
      {
        id: 'tables',
        label: 'Tables',
        operations: [{ value: 'IN', label: 'is any of' }],
        type: 'STRING_LIST',
        options: tables,
      } satisfies QueryClauseSchema<'STRING_LIST'>,
      {
        id: 'pages',
        label: 'Pages',
        operations: [{ value: 'IN', label: 'is any of' }],
        type: 'STRING_LIST',
        options: pageOptions,
      } satisfies QueryClauseSchema<'STRING_LIST'>,
    ];
  }, [stats]);
  const filters = useFilterBuilder();
  const [sortDescriptor, setSortDescriptor] = useState<
    SortDescriptor | undefined
  >({ column: 'max', direction: 'descending' });
  const [now, setNow] = useState(() => Date.now());
  const explain = useExplainAnalyze();

  useEffect(() => {
    if (stats.length === 0) return;
    const interval = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(interval);
  }, [stats.length]);

  const rows = useMemo(() => {
    const filtered = stats.filter((stat) =>
      matchesFilters(stat, filters.items),
    );
    if (!sortDescriptor) return filtered;
    const column = sortDescriptor.column as StatsColumn;
    const direction = sortDescriptor.direction === 'ascending' ? 1 : -1;
    return [...filtered].sort(
      (a, b) =>
        compareStats(a, b, column) * direction || a.id.localeCompare(b.id),
    );
  }, [filters.items, stats, sortDescriptor]);
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

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <ContentPanel>
        <ContentPanelToolbar>
          <div className="hidden min-w-0 flex-auto sm:block">
            <FilterBuilder query={filters} schema={filterSchema} multiple>
              <AddFilterTrigger
                placeholder="Filter queries…"
                title="Query filters"
                renderOption={(item) => (
                  <div className="flex items-baseline gap-2">
                    <span>{item.label}</span>
                    <span className="font-mono text-xs opacity-60">
                      {item.operations
                        .map((operation) => operation.label)
                        .join(' / ')}
                    </span>
                  </div>
                )}
                inputPrefix={
                  <Icon
                    name={IconName.Search}
                    className="h-4 w-4 shrink-0 text-gray-400"
                  />
                }
                tagsPlacement="outside"
                maxVisibleChips="auto"
                chipOverflowStrategy="all"
                tagGroupClassName="min-w-0 flex-nowrap"
                showSectionTitle={false}
                popoverPlacement="bottom start"
                popoverClassName="w-80 min-w-80 max-w-[calc(100vw-2rem)] bg-white/95 p-1"
                optionClassName="gap-2 px-2.5 py-1.5 data-[focused]:bg-blue-50 data-[focused]:text-blue-900 hover:bg-blue-50 hover:text-blue-900"
                className="min-h-6.5 w-full justify-end text-gray-800"
                inputClassName="min-h-6.5 max-w-[38ch] flex-[0_1_38ch] bg-white/70 shadow-xs hover:bg-white [&_input]:h-6 [&_input]:min-h-6 [&_input]:py-0.5 [&_input]:placeholder:text-gray-500/75"
              >
                {(props) => (
                  <FilterChip
                    {...props}
                    appearance="light"
                    showRemove
                    popoverPlacement="bottom"
                    valueClassName="max-w-56"
                  />
                )}
              </AddFilterTrigger>
            </FilterBuilder>
          </div>
          <Tooltip>
            <TooltipTrigger>
              <Button
                type="button"
                variant="icon"
                aria-label="Download all query stats as JSON"
                className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg p-0"
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
                className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg p-0"
                onClick={() => clearQueryStats(baseUrl)}
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
              bodyDependencies={[
                now,
                explain.isPending,
                explain.variables?.stat.id,
              ]}
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
                      : 'No recorded query matches the current filters.'
                  }
                />
              }
              renderCell={(stat, column) =>
                renderStatsCell(stat, column, now, explain)
              }
              rowClassName="transition-none [content-visibility:auto]"
            />
            {rows.length > MAX_TABLE_ROWS && (
              <div className="w-full pt-3 pr-4 pb-2 pl-2 text-xs text-gray-500/80">
                Showing only the first {MAX_TABLE_ROWS} of{' '}
                {formatNumber(rows.length)} queries.
              </div>
            )}
          </ContentPanelSection>
        </ContentPanelBody>
      </ContentPanel>
    </div>
  );
}

export const queryStats = { Component };
