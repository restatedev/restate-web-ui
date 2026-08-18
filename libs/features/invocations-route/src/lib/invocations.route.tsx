import { Button, SubmitButton } from '@restate/ui/button';
import { PanelTable, PanelTableColumn } from '@restate/ui/table';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import {
  COLUMN_QUERY_PREFIX,
  ColumnKey,
  isColumnValid,
  setColumns,
  setDefaultColumns,
  useColumns,
} from './columns';
import {
  getUserAddedCols,
  getUserCountMode,
  getUserLastSort,
  setUserCountMode,
  type CountMode,
} from './userPreferences';
import {
  getInvocationPreset,
  getInvocationPresetSearch,
  getDefaultInvocationsPreset,
  getInvocationsLastQuery,
  matchesAnyInvocationPreset,
  useInvocationsLastQuery,
  useInvocationsRecent,
  type InvocationPreset,
} from '@restate/util/sidebar-nav';
import { InvocationCell } from './cells';
import {
  SnapshotTimeProvider,
  useDurationSinceLastSnapshot,
} from '@restate/util/snapshot-time';
import {
  PropsWithChildren,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useSubmitShortcut, SubmitShortcutKey } from '@restate/ui/keyboard';
import {
  formatDurations,
  formatNumber,
  formatPlurals,
} from '@restate/util/intl';
import { tv } from '@restate/util/styles';
import { HoverTooltip } from '@restate/ui/tooltip';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui/content-panel';
import { EmptyState } from '@restate/ui/empty-state';
import { ErrorBanner } from '@restate/ui/error';
import {
  AddFilterTrigger,
  FilterBuilder,
  FilterChip,
  FILTER_QUERY_PREFIX,
  FilterShortcutTrigger,
  writeFilterClauses,
} from '@restate/ui/filter-builder';
import {
  ClientLoaderFunctionArgs,
  Form,
  redirect,
  ShouldRevalidateFunctionArgs,
  useHref,
  useLoaderData,
  useNavigate,
  useSearchParams,
} from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListDeployments,
  useListInvocationsV2,
} from '@restate/data-access/admin-api-hooks';
import { useRestateContext } from '@restate/features/restate-context';
import {
  VQueueStageLegend,
  VQueueStageSummaryBar,
} from '@restate/features/status-chart';
import { useBatchOperations } from '@restate/features/batch-operations';
import {
  SERVICE_PLAYGROUND_QUERY_PARAM,
  SERVICE_QUERY_PARAM,
  HANDLER_QUERY_PARAM,
} from '@restate/features/service';
import { DEPLOYMENT_QUERY_PARAM } from '@restate/features/deployment';
import { INVOCATION_QUERY_NAME } from '@restate/features/invocation-route';
import {
  PANEL_QUERY_PARAM,
  STATE_QUERY_NAME,
  stripTransientQueryParams,
} from '@restate/util/panel';
import { Badge } from '@restate/ui/badge';
import { Sort } from './QueryButton';
import {
  getFormUrlSignature,
  isNoSort,
  isSortValid,
  setDefaultSort,
  setSort,
  SORT_QUERY_PREFIX,
  useInvocationsForm,
  useListInvocationsParameters,
} from './useInvocationsQueryFilters';
import { FilterShortcuts } from './FilterShortcuts';
import { RestateMinimumVersion } from '@restate/features/restate-context';
import { useServiceTabs } from './useServiceTabs';
import { useInvocationSummary } from './useInvocationSummary';
import { resolveInvocationPopulationCount } from './invocationSummaryMatchCount';
import { INVOCATION_TABLE_COLUMN_CONFIG } from '@restate/features/invocation-ui';

const COLUMN_WIDTH: Partial<Record<ColumnKey, number>> = {
  id: INVOCATION_TABLE_COLUMN_CONFIG.id.defaultWidth,
  vqueue_id: INVOCATION_TABLE_COLUMN_CONFIG.id.defaultWidth,
  limit_key: INVOCATION_TABLE_COLUMN_CONFIG.limit_key.defaultWidth,
  created_at: INVOCATION_TABLE_COLUMN_CONFIG.created_at.defaultWidth,
  modified_at: 110,
  duration: 110,
  scheduled_at: 110,
  scheduled_start_at: 110,
  running_at: 110,
  completed_at: 110,
  // journal_size: 180,
  pinned_service_protocol_version: 80,
};
const MIN_COLUMN_WIDTH: Partial<Record<ColumnKey, number>> = {
  status: INVOCATION_TABLE_COLUMN_CONFIG.status.minWidth,
  target: INVOCATION_TABLE_COLUMN_CONFIG.target.minWidth,
  invoked_by: 100,
};
const MAX_COLUMN_WIDTH: Partial<Record<ColumnKey, number>> = {
  invoked_by: 180,
};

const PAGE_SIZE = 30;
const HERO_BREAKDOWN_SAMPLE_SIZE = 1_000_000;

const summaryHeaderStyles = tv({
  base: 'mx-auto flex w-full max-w-7xl flex-col items-stretch gap-2 px-4',
});

// Segmented control matching the JournalDetailToggle's inset-container +
// white "active" pill. Drives the table's own sampling: "Partial" caps the scan
// for speed; "Complete" counts every invocation.
const sampleScanToggleStyles = tv({
  slots: {
    // Track outline is an inset box-shadow, not a real border, so the
    // container's height matches the segment (and the neighboring buttons)
    // exactly instead of growing by the border width.
    container:
      'inline-flex items-stretch self-end rounded-lg bg-black/3 shadow-[inset_0_0_0_0.5px_rgba(39,39,42,0.06),inset_0_1px_0_0_rgba(0,0,0,0.03)]',
    // Match the Columns/Actions secondary buttons exactly (rounded-lg, p-0.5
    // px-2, text-0.5xs) so heights/text/corners line up. The active segment
    // keeps the secondary white/border/shadow look; the inactive one goes
    // transparent so the track shows through.
    segment: 'rounded-lg p-0.5 px-2 text-0.5xs',
  },
  variants: {
    active: {
      true: {},
      false: {
        segment:
          'border-transparent bg-transparent text-gray-600 shadow-none hover:bg-black/5',
      },
    },
  },
});

function SampleScanToggle({
  requestedSampled,
  resultIsPartial,
  onChange,
}: {
  requestedSampled: boolean;
  resultIsPartial: boolean;
  onChange: (sampled: boolean) => void;
}) {
  const { container, segment } = sampleScanToggleStyles();
  const partial = requestedSampled || resultIsPartial;
  return (
    <div className={container()}>
      <HoverTooltip
        content={
          resultIsPartial && !requestedSampled
            ? 'A complete scan was requested, but this query returned partial results.'
            : 'A fast, partial scan — loads quickly, but may leave some results out.'
        }
        placement="top"
        className="block"
      >
        <Button
          variant="secondary"
          onClick={() => onChange(true)}
          className={segment({ active: partial })}
        >
          Partial
        </Button>
      </HoverTooltip>
      <HoverTooltip
        content="Scans every invocation for exact results, with accurate totals and sorting."
        placement="top"
        className="block"
      >
        <Button
          variant="secondary"
          onClick={() => onChange(false)}
          className={segment({ active: !partial })}
        >
          Complete
        </Button>
      </HoverTooltip>
    </div>
  );
}

// Shown above the table while the list is sampled: the rows are a partial,
// unsorted slice, so counts/order can't be trusted as the full picture.
function SampleNotice() {
  return (
    <div className="m-2 mt-11 -mb-9 flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-600">
      <Icon
        name={IconName.Info}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400"
      />
      <span>This view may not include every matching invocation.</span>
    </div>
  );
}

const queryLoadingOverlayStyles = tv({
  slots: {
    overlay: 'pointer-events-none absolute inset-0 z-20 overflow-hidden',
    details:
      'pointer-events-auto absolute top-32 left-1/2 z-10 flex w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 flex-col items-center gap-2 text-center duration-500 animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none',
    title:
      'flex items-center justify-center gap-2 text-sm font-semibold text-gray-800',
    scanner: 'relative h-5 w-8 shrink-0',
    scannerMemory:
      'absolute top-1 right-0 flex h-3 w-4 flex-col justify-between',
    scannerMemoryLine: 'h-0.5 w-full rounded-full bg-indigo-200',
    scannerLens:
      'absolute top-0.5 left-0 h-4 w-4 animate-memoryScan text-indigo-600 drop-shadow-[0_1px_1px_--theme(--color-indigo-950/10%)] motion-reduce:animate-none',
    veil: 'pointer-events-none absolute -inset-x-20 -inset-y-8 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(249,250,251,0.98)_0%,rgba(249,250,251,0.88)_45%,rgba(249,250,251,0.45)_65%,transparent_78%)]',
  },
});

function SlowQueryOverlay({
  isComplete,
  dashboardUrl,
  onSwitchToPartial,
}: {
  isComplete: boolean;
  dashboardUrl?: string;
  onSwitchToPartial: () => void;
}) {
  const {
    overlay,
    details,
    title,
    scanner,
    scannerMemory,
    scannerMemoryLine,
    scannerLens,
    veil,
  } = queryLoadingOverlayStyles();

  return (
    <div className={overlay()}>
      <div className={details()} aria-live="polite">
        <div aria-hidden className={veil()} />
        <div className={title()}>
          <span aria-hidden className={scanner()}>
            <span className={scannerMemory()}>
              <span className={scannerMemoryLine()} />
              <span className={scannerMemoryLine()} />
              <span className={scannerMemoryLine()} />
            </span>
            <Icon name={IconName.ScanSearch} className={scannerLens()} />
          </span>
          <span>Hang tight — this is taking a moment</span>
        </div>
        <p className="max-w-sm text-xs text-gray-500">
          {isComplete
            ? 'A complete scan reads every invocation, which can take a while on large datasets. You can switch to a faster partial view, or keep waiting for exact results.'
            : 'Larger datasets can take a little longer to load — thanks for your patience.'}
        </p>
        {(isComplete || dashboardUrl) && (
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            {isComplete && (
              <Button
                variant="primary"
                onClick={onSwitchToPartial}
                className="rounded-lg px-3 py-1 text-xs"
              >
                Show a faster partial view
              </Button>
            )}
            {dashboardUrl && (
              <a
                href={dashboardUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50"
              >
                Open the dashboard
                <Icon
                  name={IconName.ExternalLink}
                  className="h-3 w-3 opacity-70"
                />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    OnboardingGuide,
    baseUrl,
    observabilityDashboardUrl,
    invocationsListOptions,
  } = useRestateContext();
  const { sampleSize, slowQueryMs, listSampledDefault } =
    invocationsListOptions;
  const queryClient = useQueryClient();
  const { saveLastQuery } = useInvocationsLastQuery();
  const { setRecent } = useInvocationsRecent();
  const {
    selectedColumns,
    setSelectedColumns,
    sortedColumnsList,
    availableColumnNames,
  } = useColumns();
  const submitRef = useSubmitShortcut();
  const { schema, isLoading, listInvocationsParameters } =
    useListInvocationsParameters();

  const [pageIndex, _setPageIndex] = useState(0);
  const [, startTransition] = useTransition();
  const setPageIndex = useCallback(
    (arg: Parameters<typeof _setPageIndex>[0]) => {
      startTransition(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
        _setPageIndex(arg);
      });
    },
    [],
  );
  const resetPageIndex = useCallback(() => setPageIndex(0), [setPageIndex]);

  const loaderData = useLoaderData<typeof clientLoader>();
  const [countMode, setCountModeState] = useState<CountMode>(
    loaderData?.countMode ?? 'estimate',
  );
  const setCountMode = useCallback((mode: CountMode) => {
    setUserCountMode(mode);
    setCountModeState(mode);
  }, []);
  const breakdownSampleSize = HERO_BREAKDOWN_SAMPLE_SIZE;

  // The table's sampling is its own knob. Until the user picks a mode it
  // follows the per-preset default (invocationsListOptions from the Restate
  // context); once they toggle it, that explicit choice sticks for the rest of
  // the session across every query/preset. Session-scoped: a fresh visit to
  // /invocations starts back on the per-preset default.
  const searchString = searchParams.toString();
  const listPreset = useMemo<InvocationPreset>(
    () => getInvocationPreset(new URLSearchParams(searchString)),
    [searchString],
  );
  const [listSampledOverride, setListSampledOverride] = useState<
    boolean | null
  >(null);
  const listSampled =
    listSampledOverride ??
    invocationsListOptions.listSampledDefaultByPreset[listPreset] ??
    listSampledDefault;

  const {
    data: summaryData,
    focus: vqueueSummaryFocus,
    byStage,
    byStatus,
    populationByStage,
    populationByStatus,
    countsAreContextual,
    statusFilter,
    isLoading: isStageSummaryLoading,
    isStageFetching,
    isError: isSummaryError,
    refresh: refreshSummary,
    isBreakdownLoading: isVqueueBreakdownLoading,
    isBreakdownError: isVqueueBreakdownError,
    breakdownIsSampled,
    canSampleBreakdown,
    stageCountsReflectFilters,
    matchingCount: summaryMatchingCount,
    isDimmed: statusDim,
    getHref: statusHref,
  } = useInvocationSummary({
    filters: listInvocationsParameters.filters,
    countMode,
    breakdownSampleSize,
  });
  const { data: deploymentsData } = useListDeployments();
  const serviceTabs = useServiceTabs(
    summaryData,
    deploymentsData,
    statusFilter,
    isStageSummaryLoading,
  );
  // Href that clears filter_status — drives the legend's leading "All"
  // reset entry. Simply deletes the key; the loader doesn't auto-restore
  // unless ?restore=1 is present.
  const clearStatusFilterHref = useMemo(() => {
    const out = new URLSearchParams(searchParams);
    out.delete('filter_status');
    return `${baseUrl}/invocations?${out.toString()}`;
  }, [searchParams, baseUrl]);
  const hasActiveFilters = Array.from(searchParams.keys()).some((key) =>
    key.startsWith(FILTER_QUERY_PREFIX),
  );
  const {
    dataUpdatedAt,
    errorUpdatedAt,
    error,
    data,
    isFetching,
    isPending,
    queryKey,
    refetch,
  } = useListInvocationsV2(
    {
      ...listInvocationsParameters,
      mode: listSampled ? { type: 'sampled', sampleSize } : { type: 'exact' },
    },
    {
      refetchOnReconnect: false,
      staleTime: 0,
      refetchOnWindowFocus: false,
      onFetchStart: refreshSummary,
    },
  );
  const changeListMode = useCallback(
    (sampled: boolean) => {
      if (sampled === listSampled) {
        void refetch();
      } else {
        setListSampledOverride(sampled);
      }
    },
    [listSampled, refetch],
  );

  const dataUpdate = error ? errorUpdatedAt : dataUpdatedAt;

  // Once the loading skeleton has been up past slowQueryMs, surface a calm
  // reassurance banner. Reset (and restart the clock) whenever a fresh query
  // starts — a new filter/sort or sampling change gets its own grace period.
  const [isSlowQuery, setIsSlowQuery] = useState(false);
  useEffect(() => {
    setIsSlowQuery(false);
    if (!isFetching) {
      return;
    }
    const timer = setTimeout(() => setIsSlowQuery(true), slowQueryMs);
    return () => clearTimeout(timer);
  }, [isFetching, searchString, listSampled, slowQueryMs]);

  const listRowCount = data?.rows?.length ?? 0;
  const listLimit = data?.limit ?? 0;
  const { count: effectiveTotal, accuracy: totalAccuracy } =
    resolveInvocationPopulationCount({
      summaryMatchCount: summaryMatchingCount,
      listIsAvailable: data != null,
      listRowCount,
      listLimit,
      listIsPartial: Boolean(data?.isPartial),
    });
  const actionsTotalDisplay = `${totalAccuracy === 'estimate' ? '~' : ''}${formatNumber(effectiveTotal, true)}${totalAccuracy === 'lower-bound' ? '+' : ''}`;
  const offerCompleteScan =
    listSampled && (Boolean(data?.isPartial) || effectiveTotal > 0);

  const [selectedInvocationIds, setSelectedInvocationIds] = useState<
    Set<string>
  >(new Set());

  const currentPageItems = useMemo(() => {
    return (
      data?.rows?.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE) ??
      []
    );
  }, [pageIndex, data?.rows]);

  // TODO
  useEffect(() => {
    if (Number(data?.rows?.length) <= PAGE_SIZE * pageIndex) {
      setPageIndex(0);
    }
  }, [pageIndex, setPageIndex, data?.rows?.length]);

  const totalSize = Math.ceil((data?.rows ?? []).length / PAGE_SIZE);
  const hash = 'hash' + currentPageItems.map(({ id }) => id).join('');

  const panelColumns = useMemo<PanelTableColumn<ColumnKey>[]>(
    () =>
      sortedColumnsList.map((col) =>
        col.id === 'actions'
          ? {
              id: 'actions' as ColumnKey,
              name: 'Actions',
              width: 40,
              hideLabel: true,
            }
          : {
              id: col.id,
              name: col.name,
              isRowHeader: col.isRowHeader,
              defaultWidth: COLUMN_WIDTH[col.id],
              minWidth: MIN_COLUMN_WIDTH[col.id] ?? 80,
              maxWidth: MAX_COLUMN_WIDTH[col.id],
            },
      ),
    [sortedColumnsList],
  );

  const {
    batchPurge,
    batchResume,
    batchCancel,
    batchKill,
    batchPause,
    batchRestartAsNew,
    batchRetryNow,
  } = useBatchOperations();

  useEffect(() => {
    setSelectedInvocationIds(new Set());
  }, [isFetching, pageIndex]);

  const navigate = useNavigate();
  const basePath = useHref('/');
  const isModifierPressed = useRef(false);
  const changeVqueueSummaryFocus = useCallback(
    (focus: typeof vqueueSummaryFocus) => {
      navigate(
        focus === 'all'
          ? clearStatusFilterHref
          : statusHref(focus === 'completed' ? 'finished' : 'not-completed'),
      );
    },
    [clearStatusFilterHref, navigate, statusHref],
  );

  useEffect(() => {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isMac ? e.metaKey : e.ctrlKey) {
        isModifierPressed.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (isMac ? !e.metaKey : !e.ctrlKey) {
        isModifierPressed.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const restorableSearchParams = stripTransientQueryParams(searchParams);
    saveLastQuery(restorableSearchParams);
    if (!matchesAnyInvocationPreset(restorableSearchParams)) {
      setRecent({ type: 'custom', value: restorableSearchParams.toString() });
    }
  }, [searchParams, saveLastQuery, setRecent]);

  const tableCaption =
    isFetching && isSlowQuery ? (
      <SlowQueryOverlay
        isComplete={!listSampled}
        dashboardUrl={observabilityDashboardUrl}
        onSwitchToPartial={() => {
          queryClient.cancelQueries({ queryKey });
          setListSampledOverride(true);
        }}
      />
    ) : !isFetching && (listSampled || data?.isPartial) && !error ? (
      <SampleNotice />
    ) : undefined;

  return (
    <SnapshotTimeProvider lastSnapshot={dataUpdate}>
      <div className="relative flex min-h-0 flex-1 flex-col gap-4 pt-20">
        <div className={summaryHeaderStyles()}>
          <VQueueStageSummaryBar
            byStage={byStage}
            byStatus={byStatus}
            focus={vqueueSummaryFocus}
            onFocusChange={changeVqueueSummaryFocus}
            breakdownMode={countMode}
            canSampleBreakdown={canSampleBreakdown}
            onBreakdownModeChange={setCountMode}
            isLoading={isStageSummaryLoading}
            isFetching={isStageFetching}
            isDimmed={statusDim}
            getHref={statusHref}
            areStageCountsPartial={summaryData?.stageCountsArePartial}
            isBreakdownSampled={breakdownIsSampled}
            countsReflectFilters={stageCountsReflectFilters}
            populationByStage={populationByStage}
            countsAreContextual={countsAreContextual}
            isBreakdownLoading={isVqueueBreakdownLoading}
          />
          <VQueueStageLegend
            byStage={byStage}
            byStatus={byStatus}
            focus={vqueueSummaryFocus}
            isBreakdownSampled={breakdownIsSampled}
            areStageCountsPartial={summaryData?.stageCountsArePartial}
            isLoading={isStageSummaryLoading}
            isError={isSummaryError}
            isDimmed={statusDim}
            getHref={statusHref}
            populationByStage={populationByStage}
            populationByStatus={populationByStatus}
            countsAreContextual={countsAreContextual}
            isBreakdownLoading={isVqueueBreakdownLoading}
            isBreakdownError={isVqueueBreakdownError}
          />
        </div>
        <ContentPanel tabs={serviceTabs}>
          <ContentPanelToolbar>
            <SampleScanToggle
              requestedSampled={listSampled}
              resultIsPartial={Boolean(data?.isPartial)}
              onChange={changeListMode}
            />
            <Dropdown>
              <DropdownTrigger>
                <Button
                  variant="secondary"
                  className="flex items-center gap-1.5 self-end rounded-lg p-0.5 px-2 text-0.5xs"
                >
                  <Icon
                    name={IconName.TableProperties}
                    className="aspect-square h-3.5 w-3.5 opacity-70"
                  />
                  Columns
                </Button>
              </DropdownTrigger>
              <DropdownPopover>
                <DropdownSection title="Columns">
                  <DropdownMenu
                    multiple
                    selectable
                    selectedItems={selectedColumns}
                    onSelect={setSelectedColumns}
                  >
                    {Object.entries(availableColumnNames)
                      .filter(([key]) => key !== 'actions')
                      .map(([key, name]) => (
                        <DropdownItem key={key} value={key}>
                          {name}
                        </DropdownItem>
                      ))}
                  </DropdownMenu>
                </DropdownSection>
              </DropdownPopover>
            </Dropdown>
            <Dropdown>
              <DropdownTrigger>
                <Button
                  variant={
                    selectedInvocationIds.size > 0 ? 'primary' : 'secondary'
                  }
                  className="flex items-center gap-1.5 self-end rounded-lg p-0.5 px-2 text-0.5xs"
                >
                  Actions{' '}
                  {Boolean(selectedInvocationIds.size || effectiveTotal) && (
                    <Badge
                      size="xs"
                      variant={
                        selectedInvocationIds.size > 0 ? 'default' : 'info'
                      }
                    >
                      {selectedInvocationIds.size > 0
                        ? `${selectedInvocationIds.size}`
                        : actionsTotalDisplay}
                    </Badge>
                  )}
                  <Icon
                    name={IconName.ChevronsUpDown}
                    className="aspect-square h-3.5 w-3.5 opacity-80"
                  />
                </Button>
              </DropdownTrigger>
              <DropdownPopover>
                <DropdownSection
                  title={
                    <div>
                      {selectedInvocationIds.size ? (
                        <span>
                          Actions{' '}
                          <span className="font-normal opacity-90">
                            on {selectedInvocationIds.size} selected items
                          </span>
                        </span>
                      ) : effectiveTotal > 0 ? (
                        <span>
                          Actions{' '}
                          <span className="font-normal opacity-90">
                            on all {actionsTotalDisplay}{' '}
                            {formatPlurals(effectiveTotal, {
                              one: 'result',
                              other: 'results',
                            })}
                          </span>
                        </span>
                      ) : (
                        'Actions'
                      )}
                    </div>
                  }
                >
                  <DropdownMenu
                    selectable
                    selectedItems={selectedColumns}
                    onSelect={(key) => {
                      const args =
                        selectedInvocationIds.size > 0
                          ? {
                              invocationIds: Array.from(
                                selectedInvocationIds.values(),
                              ),
                            }
                          : // TODO
                            {
                              filters: listInvocationsParameters.filters || [],
                            };
                      switch (key) {
                        case 'cancel': {
                          return batchCancel(args, schema);
                        }
                        case 'kill': {
                          return batchKill(args, schema);
                        }
                        case 'pause': {
                          return batchPause(args, schema);
                        }
                        case 'resume': {
                          return batchResume(args, schema);
                        }
                        case 'retry-now': {
                          return batchRetryNow(args, schema);
                        }
                        case 'purge': {
                          return batchPurge(args, schema);
                        }
                        case 'restart-as-new': {
                          return batchRestartAsNew(args, schema);
                        }

                        default:
                          break;
                      }
                    }}
                  >
                    <DropdownItem value="cancel" destructive>
                      <Icon
                        name={IconName.Cancel}
                        className="h-3.5 w-3.5 shrink-0 opacity-80"
                      />
                      Cancel…
                    </DropdownItem>
                    <RestateMinimumVersion minVersion="1.6.0">
                      <DropdownItem value="pause" destructive>
                        <Icon
                          name={IconName.Pause}
                          className="h-3.5 w-3.5 shrink-0 opacity-80"
                        />
                        Pause…
                      </DropdownItem>
                    </RestateMinimumVersion>
                    <DropdownItem value="resume">
                      <Icon
                        name={IconName.Play}
                        className="h-3.5 w-3.5 shrink-0 opacity-80"
                      />
                      Resume…
                    </DropdownItem>
                    <DropdownItem value="retry-now">
                      <Icon
                        name={IconName.RetryNow}
                        className="h-3.5 w-3.5 shrink-0 opacity-80"
                      />
                      Retry now…
                    </DropdownItem>
                    <DropdownItem value="restart-as-new">
                      <Icon
                        name={IconName.Restart}
                        className="h-3.5 w-3.5 shrink-0 opacity-80"
                      />
                      Restart as new…
                    </DropdownItem>
                    <DropdownItem value="kill" destructive>
                      <Icon
                        name={IconName.Kill}
                        className="h-3.5 w-3.5 shrink-0 opacity-80"
                      />
                      Kill…
                    </DropdownItem>
                    <DropdownItem value="purge" destructive>
                      <Icon
                        name={IconName.Trash}
                        className="h-3.5 w-3.5 shrink-0 opacity-80"
                      />
                      Purge…
                    </DropdownItem>
                  </DropdownMenu>
                </DropdownSection>
              </DropdownPopover>
            </Dropdown>
          </ContentPanelToolbar>
          <ContentPanelBody className="pb-32">
            <ContentPanelSection flush>
              <PanelTable
                aria-label="Invocations"
                caption={tableCaption}
                columns={panelColumns}
                items={currentPageItems}
                selectionMode="multiple"
                selectedKeys={selectedInvocationIds}
                onSelectionChange={(keys) =>
                  setSelectedInvocationIds(keys as Set<string>)
                }
                onRowAction={(key) => {
                  const preservedParams = new URLSearchParams();
                  const paramsToPreserve = [
                    SERVICE_PLAYGROUND_QUERY_PARAM,
                    SERVICE_QUERY_PARAM,
                    DEPLOYMENT_QUERY_PARAM,
                    INVOCATION_QUERY_NAME,
                    STATE_QUERY_NAME,
                    HANDLER_QUERY_PARAM,
                    PANEL_QUERY_PARAM,
                  ];
                  paramsToPreserve.forEach((param) => {
                    searchParams.getAll(param).forEach((value) => {
                      preservedParams.append(param, value);
                    });
                  });
                  const pathname = `${baseUrl}/invocations/${key}`;
                  const search = preservedParams.toString();
                  if (isModifierPressed.current) {
                    const fullPath = `${basePath}${pathname}`.replace(
                      '//',
                      '/',
                    );
                    window.open(
                      `${fullPath}${search ? `?${search}` : ''}`,
                      '_blank',
                    );
                  } else {
                    navigate({ pathname, search });
                  }
                }}
                bodyKey={hash}
                bodyDependencies={[selectedColumns, pageIndex, error]}
                isLoading={isFetching}
                numOfRows={Math.max(currentPageItems.length, 8)}
                emptyPlaceholder={
                  error ? (
                    <EmptyState
                      icon={IconName.TriangleAlert}
                      intent="danger"
                      title="Couldn’t load invocations"
                    >
                      <ErrorBanner
                        error={error}
                        className="w-full rounded-xl text-left"
                      />
                    </EmptyState>
                  ) : offerCompleteScan ? (
                    <EmptyState
                      icon={IconName.ScanSearch}
                      title="No matches in this partial scan"
                      description="Some invocations match, but this partial scan didn’t surface them. Run a complete scan to search every invocation."
                    >
                      <Button
                        variant="primary"
                        onClick={() => setListSampledOverride(false)}
                        className="rounded-lg px-3 py-1 text-xs"
                      >
                        Run a complete scan
                      </Button>
                    </EmptyState>
                  ) : (
                    <EmptyState
                      icon={IconName.Invocation}
                      title="No invocations found"
                      description={
                        hasActiveFilters
                          ? 'No invocations match the current filters. Try adjusting or clearing them.'
                          : 'Invocations will appear here as your services handle requests.'
                      }
                    />
                  )
                }
                rowClassName="bg-transparent [content-visibility:auto] [&:has(td[role=rowheader]_a[data-invocation-selected='true'])]:bg-blue-50"
                renderCell={(row, { id }) => (
                  <InvocationCell
                    key={id}
                    column={id}
                    invocation={row}
                    isVisible
                  />
                )}
              />
              <Footnote
                data={data}
                totalCount={effectiveTotal}
                totalAccuracy={totalAccuracy}
                hasActiveFilters={hasActiveFilters}
                key={dataUpdate}
              >
                {!isPending && !error && totalSize > 1 && (
                  <div className="flex items-center rounded-lg border bg-zinc-50 py-0.5 shadow-xs">
                    <Button
                      variant="icon"
                      disabled={pageIndex === 0}
                      onClick={() => setPageIndex(0)}
                    >
                      <Icon name={IconName.ChevronFirst} className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="icon"
                      disabled={pageIndex === 0}
                      onClick={() => setPageIndex((s) => s - 1)}
                      className=""
                    >
                      <Icon name={IconName.ChevronLeft} className="h-4 w-4" />
                    </Button>
                    <div className="mx-2 flex items-center gap-0.5 text-0.5xs">
                      {pageIndex + 1} / {totalSize}
                    </div>

                    <Button
                      variant="icon"
                      disabled={pageIndex + 1 === totalSize}
                      onClick={() => setPageIndex((s) => s + 1)}
                      className=""
                    >
                      <Icon name={IconName.ChevronRight} className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="icon"
                      disabled={pageIndex + 1 === totalSize}
                      onClick={() => setPageIndex(totalSize - 1)}
                    >
                      <Icon name={IconName.ChevronLast} className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </Footnote>
            </ContentPanelSection>
            {OnboardingGuide && (
              <div className="ml-10">
                <OnboardingGuide
                  stage="view-invocations"
                  service={data?.rows.at(0)?.target_service_name}
                />
              </div>
            )}
          </ContentPanelBody>
        </ContentPanel>
      </div>
      <LayoutOutlet zone={LayoutZone.Toolbar}>
        <InvocationsForm
          key={getFormUrlSignature(searchParams)}
          schema={schema}
          isLoading={isLoading}
          selectedColumns={selectedColumns}
          setPageIndex={setPageIndex}
          resetPageIndex={resetPageIndex}
          isFetching={isFetching}
          submitRef={submitRef}
          queryKey={queryKey}
        />
      </LayoutOutlet>
    </SnapshotTimeProvider>
  );
}

interface InvocationsFormProps {
  schema: ReturnType<typeof useListInvocationsParameters>['schema'];
  isLoading: boolean;
  selectedColumns: ReturnType<typeof useColumns>['selectedColumns'];
  setPageIndex: (arg: number | ((prev: number) => number)) => void;
  resetPageIndex: () => void;
  isFetching: boolean;
  submitRef: RefObject<HTMLButtonElement | null>;
  queryKey: readonly unknown[];
}

function InvocationsForm({
  schema,
  isLoading,
  selectedColumns,
  setPageIndex,
  resetPageIndex,
  isFetching,
  submitRef,
  queryKey,
}: InvocationsFormProps) {
  const queryClient = useQueryClient();
  const { query, sortParams, setSortParams, commitQuery } = useInvocationsForm({
    schema,
    isLoading,
    selectedColumns,
    resetPageIndex,
  });

  return (
    <Form
      action="/query/v2/invocations"
      method="POST"
      className="relative flex w-[60rem] flex-col"
      onSubmit={async (event) => {
        event.preventDefault();
        // The Query button and the Cmd/Ctrl+Enter shortcut submit via a real
        // button click, so they carry a `submitter` — those are explicit "run
        // it now" actions and always refetch. Closing a filter chip
        // auto-submits via requestSubmit() (no submitter); that should only
        // refetch when the query actually changed.
        const isExplicitSubmit = Boolean(
          (event.nativeEvent as SubmitEvent).submitter,
        );
        const changed = commitQuery();
        if (changed || !isExplicitSubmit) {
          return;
        }
        await queryClient.invalidateQueries({ queryKey });
      }}
    >
      <FilterBuilder query={query} schema={schema} multiple>
        <AddFilterTrigger
          MenuTrigger={FilterShortcutTrigger}
          placeholder="Filter invocations…"
          prefix={
            <Sort setSortParams={setSortParams} sortParams={sortParams} />
          }
          title="Filters"
          className="w-full rounded-xl border-transparent pb-8 has-[input[data-focused=true]]:border-blue-500 has-[input[data-focused=true]]:ring-blue-500 [&_input]:min-w-[25ch] [&_input]:placeholder-zinc-400 [&_input+*]:right-24 [&_input::-webkit-search-cancel-button]:invert"
        >
          {FilterChip}
        </AddFilterTrigger>
      </FilterBuilder>
      <div className="absolute right-0 bottom-0 left-0 flex h-8 w-full overflow-hidden rounded-b-xl mask-[linear-gradient(to_right,transparent_0,black_6px,black_calc(100%-192px),transparent_calc(100%-100px))]">
        <div className="flex [scrollbar-width:thin] items-center gap-2 overflow-auto pb-0.5 pl-1.5">
          <div className="ml-1 flex h-full shrink-0 items-center text-xs text-white/70">
            Quick Filters:
          </div>
          <FilterShortcuts schema={schema} setPageIndex={setPageIndex} />
        </div>
      </div>
      <SubmitButton
        ref={submitRef}
        isPending={isFetching}
        className="absolute right-1 bottom-1 flex h-7 items-center gap-2 rounded-lg py-0 pr-0.5 pl-4"
      >
        Query
        <SubmitShortcutKey />
      </SubmitButton>
    </Form>
  );
}

function Footnote({
  data,
  totalCount,
  totalAccuracy,
  hasActiveFilters,
  children,
}: PropsWithChildren<{
  data?: ReturnType<typeof useListInvocationsV2>['data'];
  totalCount: number;
  totalAccuracy: 'exact' | 'estimate' | 'lower-bound';
  hasActiveFilters: boolean;
}>) {
  const [now, setNow] = useState(() => Date.now());
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    setNow(Date.now());

    if (data) {
      interval = setInterval(() => {
        setNow(Date.now());
      }, 30_000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [data]);

  const duration = formatDurations(durationSinceLastSnapshot(now));

  const visibleCount = data?.rows?.length ?? 0;
  const isTruncated = visibleCount > 0 && visibleCount < totalCount;

  return (
    <div className="flex w-full flex-row-reverse flex-wrap items-center gap-2 pt-3 pr-4 pb-2 pl-2 text-center text-xs text-gray-500/80">
      {data && (
        <div className="ml-auto">
          {visibleCount === 0 && totalCount === 0 ? (
            'No invocations found'
          ) : totalAccuracy === 'lower-bound' ? (
            <>
              <span className="font-medium text-gray-500">
                {formatNumber(visibleCount)}+
              </span>{' '}
              {hasActiveFilters && 'matching '}
              {formatPlurals(visibleCount, {
                one: 'invocation',
                other: 'invocations',
              })}
            </>
          ) : (
            <>
              {(isTruncated || totalAccuracy === 'estimate') && (
                <>
                  <span className="font-medium text-gray-500">
                    {formatNumber(visibleCount)}
                  </span>
                  {' shown of '}
                </>
              )}
              <span className="font-medium text-gray-500">
                {totalAccuracy === 'estimate' && '~'}
                {formatNumber(totalCount, true)}
              </span>{' '}
              {hasActiveFilters && 'matching '}
              {formatPlurals(totalCount, {
                one: 'invocation',
                other: 'invocations',
              })}
            </>
          )}{' '}
          as of{' '}
          <span className="font-medium text-gray-500">{duration} ago</span>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export const clientLoader = ({ request }: ClientLoaderFunctionArgs) => {
  const url = new URL(request.url);
  let params = new URLSearchParams(url.searchParams);
  const originalParams = new URLSearchParams(url.searchParams);
  originalParams.sort();
  const originalSearch = originalParams.toString();
  // remove: why removing here
  for (const field of [
    'scheduled_at',
    'scheduled_start_at',
    'restarted_from',
    'first_runnable_at',
    'num_errors',
  ]) {
    params.delete(`${FILTER_QUERY_PREFIX}${field}`);
  }
  params.sort();

  // Fresh, query-less entry to /invocations (typed URL / app landing): apply the
  // configured default preset. The Invocations nav link and the "All" sub-item
  // both carry params, so only a truly empty URL reaches here — this avoids
  // trapping a user who explicitly cleared their filters back to the All view.
  if (originalSearch === '') {
    const preset = getDefaultInvocationsPreset();
    if (preset && preset !== 'all') {
      const presetSearch = getInvocationPresetSearch(preset);
      if (presetSearch) {
        return redirect(`?${presetSearch}`);
      }
    }
  }

  // Explicit opt-in to last-filter restoration. The "Back to invocations"
  // link on the detail page navigates here with ?restore=1; no other entry
  // path triggers it. Default navigation (sidebar All, fresh URL, shortcuts)
  // shows the unfiltered view. The flag is consumed and stripped, then we
  // fall through to the redirect at the bottom so the user lands on a clean
  // URL with the restored filter_*/sort_*/column keys.
  if (params.get('restore') === '1') {
    params.delete('restore');
    // `request.url` includes the router basename (e.g. web-ui's `/ui`), which
    // the RestateContext `baseUrl` that the page scopes its saved query by does
    // not. Strip the basename (Vite's per-app `BASE_URL`) so the loader reads
    // the same scope bucket the page wrote to.
    const basename = (
      import.meta as ImportMeta & { env: { BASE_URL: string } }
    ).env.BASE_URL.replace(/\/+$/, '');
    const path = url.pathname.startsWith(basename)
      ? url.pathname.slice(basename.length)
      : url.pathname;
    const lastQuery = getInvocationsLastQuery(
      path.replace(/\/invocations$/, ''),
    );
    if (lastQuery) {
      Array.from(lastQuery.keys())
        .filter(
          (k) =>
            k.startsWith(FILTER_QUERY_PREFIX) ||
            k.startsWith(SORT_QUERY_PREFIX) ||
            k === COLUMN_QUERY_PREFIX,
        )
        .forEach((k) => {
          // Only restore keys the caller hasn't already set — explicit
          // filter_*/sort_*/column on the URL always wins over the saved
          // state. Restoring sort_* (incl. the `sort_field=none` no-sort
          // marker) keeps a no-sort preset like Processing from picking up the
          // default sort on back-navigation; restoring column keeps
          // preset-specific columns (idempotency_key, scheduled_start_at, …).
          // The `column` key repeats per value, but the guard makes the first
          // occurrence append all of them and the rest no-op.
          if (!params.has(k)) {
            lastQuery.getAll(k).forEach((v) => params.append(k, v));
          }
        });
    }
  }

  if (!isSortValid(params) && !isNoSort(params)) {
    const userSort = getUserLastSort();
    if (userSort) {
      params = setSort(params, {
        field: userSort.field,
        order: userSort.order,
      });
    } else {
      params = setDefaultSort(params);
    }
  }

  if (!isColumnValid(params)) {
    params = setDefaultColumns(params);
  }
  const userCols = getUserAddedCols();
  if (userCols.length > 0) {
    const currentCols = params.getAll(COLUMN_QUERY_PREFIX) as ColumnKey[];
    const merged = [...currentCols];
    userCols.forEach((c) => {
      if (!merged.includes(c)) merged.push(c);
    });
    if (merged.length !== currentCols.length) {
      params = setColumns(params, merged);
    }
  }

  params.sort();
  if (params.toString() === originalSearch) {
    return { countMode: getUserCountMode() };
  }
  return redirect(`?${params.toString()}`);
};

export function shouldRevalidate(arg: ShouldRevalidateFunctionArgs) {
  if (!arg.nextUrl.pathname.endsWith('/invocations')) {
    return false;
  }
  return arg.defaultShouldRevalidate;
}

export const invocations = { Component, clientLoader, shouldRevalidate };
