import { useRef, useMemo, useState } from 'react';
import { tv } from '@restate/util/styles';
import { formatNumber, formatPercentage } from '@restate/util/intl';
import { ErrorBanner } from '@restate/ui/error';
import { HoverTooltip } from '@restate/ui/tooltip';
import { Icon, IconName } from '@restate/ui/icons';
import { STATUS_COLUMNS, MAX_VISIBLE_SERVICES } from './constants';
import { buildHeatmapData } from './heatmap-data';
import type { InvocationsSummaryProps, CellData } from './types';


const PLACEHOLDER_BAR_PCTS = [75, 40, 55, 90, 20, 35, 60, 45, 30];
function useRandomOpacities(isLoading: boolean) {
  const map = useRef(new Map<string, number>());
  const wasLoading = useRef(false);
  if (isLoading && !wasLoading.current) {
    map.current.clear();
  }
  wasLoading.current = isLoading;

  return (key: string) => {
    let value = map.current.get(key);
    if (value === undefined) {
      value = 0.01 + Math.random() * 0.09;
      map.current.set(key, value);
    }
    return value;
  };
}

type StatusVariant =
  | 'ready'
  | 'scheduled'
  | 'pending'
  | 'running'
  | 'backing-off'
  | 'paused'
  | 'suspended'
  | 'succeeded'
  | 'failed';

const wrapperStyles = tv({
  base: 'relative min-w-0 filter-[drop-shadow(0_12px_10px_rgb(39_39_42/0.15))_drop-shadow(0_4px_5px_rgb(39_39_42/0.2))]',
});

const containerStyles = tv({
  base: 'max-w-full overflow-hidden rounded-2xl bg-zinc-700 shadow-[inset_-4px_0_6px_-3px_rgb(0_0_0/0.08)]',
});

const heatmapRowStyles = tv({
  base: 'flex',
  variants: {
    variant: {
      header: 'mb-1.5 border-b border-black/20 pr-1.5 pb-0.5',
      data: 'pr-1.5',
    },
  },
});

const firstColStyles = tv({
  base: 'absolute inset-y-px left-px z-20 w-90 rounded-2xl rounded-r-sm border border-transparent shadow-[2px_0_4px_-1px_rgb(0_0_0/0.15)] backdrop-blur-xl [background:linear-gradient(to_bottom,rgb(39_39_42/0.9),rgb(39_39_42/0.8))_padding-box,linear-gradient(to_right,rgb(255_255_255/0.15),transparent)_border-box]',
});

const firstColStatusRowStyles = tv({
  base: 'flex cursor-pointer pr-1.5 transition-colors select-none hover:bg-white/5',
  variants: {
    isIncluded: {
      true: '',
      false: 'opacity-40',
    },
  },
  defaultVariants: {
    isIncluded: true,
  },
});

const statusLabelColStyles = tv({
  base: 'flex w-42 min-w-42 shrink-0 items-center justify-end px-2',
  variants: {
    size: {
      lg: 'h-10',
      sm: 'h-6',
    },
  },
});

const barChartColStyles = tv({
  base: 'flex w-45 min-w-45 shrink-0 items-center',
  variants: {
    size: {
      lg: 'h-10 justify-end px-2 text-right',
      sm: 'h-6 gap-1.5 px-1.5',
    },
  },
});

const serviceColStyles = tv({
  base: 'min-w-20 shrink-0 grow-0 basis-30',
});

const barTrackStyles = tv({
  base: 'h-4 rounded-sm border transition-all duration-500',
  variants: {
    status: {
      ready: 'border-dashed border-zinc-400 bg-zinc-500/40',
      scheduled: 'border-dashed border-zinc-400 bg-zinc-500/40',
      pending: 'border-dashed border-amber-300/70 bg-amber-400/20',
      running: 'border-dashed border-blue-400/70 bg-blue-500/30',
      'backing-off': 'border-dashed border-amber-400/70 bg-amber-500/30',
      paused: 'border-amber-400/70 bg-amber-500/30',
      suspended: 'border-zinc-400 bg-zinc-500/40',
      succeeded: 'border-green-400/50 bg-green-500/30',
      failed: 'border-red-400 bg-red-500/50',
    },
    loading: {
      true: 'border-transparent bg-white/10',
    },
  },
});

const placeholderFillStyles = tv({
  base: 'rounded-sm transition-[background-color] duration-500',
});

const heatFillStyles = tv({
  base: 'absolute inset-0 rounded-sm transition-opacity duration-500',
  variants: {
    status: {
      ready: 'bg-zinc-300',
      scheduled: 'bg-zinc-300',
      pending: 'bg-amber-400',
      running: 'bg-blue-300',
      'backing-off': 'bg-amber-400',
      paused: 'bg-amber-400',
      suspended: 'bg-zinc-300',
      succeeded: 'bg-green-300',
      failed: 'bg-red-400',
    },
  },
});

const heatCellStyles = tv({
  base: 'relative h-6 cursor-pointer rounded-sm border border-transparent transition-all hover:z-10 hover:border-white/20 hover:shadow-sm hover:shadow-black/20',
  variants: {
    shaded: {
      true: 'bg-white/5',
      false: '',
    },
    isIncluded: {
      true: '',
      false: 'opacity-40',
    },
    isNonInteractive: {
      true: 'cursor-default',
      false: '',
    },
  },
  defaultVariants: {
    shaded: false,
    isIncluded: true,
    isNonInteractive: false,
  },
});

const cellCountStyles = tv({
  base: 'relative z-10 flex h-full items-center justify-center text-2xs',
  variants: {
    prominent: {
      true: 'font-medium',
      false: '',
    },
    status: {
      ready: 'text-zinc-300/80',
      scheduled: 'text-zinc-300/80',
      pending: 'text-orange-200/80',
      running: 'text-blue-200/80',
      'backing-off': 'text-orange-200/80',
      suspended: 'text-zinc-300/80',
      paused: 'text-orange-200/80',
      succeeded: 'text-green-200/80',
      failed: 'text-red-200/80',
    },
  },
  defaultVariants: {
    prominent: false,
  },
});

const emptyCellStyles = tv({
  base: 'relative z-10 flex h-full items-center justify-center rounded-sm bg-white/[0.015] text-2xs text-zinc-500',
});

const serviceHeaderStyles = tv({
  base: 'flex h-10 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-sm px-1 text-center text-xs font-medium text-zinc-300 transition-colors select-none hover:bg-white/5 hover:text-zinc-100',
  variants: {
    isOthers: {
      true: 'cursor-default text-zinc-400 italic hover:text-zinc-400',
      false: '',
    },
    shaded: {
      true: 'bg-white/5',
      false: '',
    },
  },
  defaultVariants: {
    isOthers: false,
    shaded: false,
  },
});

function CellTooltipContent({ cell }: { cell: CellData }) {
  const pctOfStatus = cell.columnTotal > 0 ? cell.count / cell.columnTotal : 0;
  const pctOfService =
    cell.serviceTotal > 0 ? cell.count / cell.serviceTotal : 0;
  const colDef = STATUS_COLUMNS.find((c) => c.key === cell.columnKey);
  const statusLabel = colDef?.label ?? cell.columnKey;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className="font-medium">{statusLabel}</span>
        <span className="text-gray-400">&middot;</span>
        <span className="max-w-[200px] truncate text-gray-300">
          {cell.service}
        </span>
      </div>
      <div>
        <span className="font-medium">{formatNumber(cell.count)}</span>
      </div>
      <div className="flex gap-3 text-gray-400">
        <span>{Math.round(pctOfService * 100)}% of service</span>
        <span>
          {Math.round(pctOfStatus * 100)}% of {statusLabel}
        </span>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className={containerStyles()}>
      <div className="p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mb-1 flex gap-2">
            <div className="h-6 w-20 animate-pulse rounded-sm bg-white/10" />
            <div className="h-6 flex-1 animate-pulse rounded-sm bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className={containerStyles()}>
      <div className="flex flex-col items-center gap-2 py-10">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
          <svg
            className="h-5 w-5 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-500">
          No invocations found
        </p>
      </div>
    </div>
  );
}

export function InvocationsSummary({
  data,
  isPending,
  isFetching,
  isPlaceholderData,
  error,
  onClick,
  toolbar,
}: InvocationsSummaryProps) {
  const isLoading = Boolean(isFetching || isPlaceholderData);
  const getPlaceholderOpacity = useRandomOpacities(isLoading);
  const [visibleCount, setVisibleCount] = useState(MAX_VISIBLE_SERVICES);
  const heatmap = useMemo(
    () => (data ? buildHeatmapData(data, visibleCount) : null),
    [data, visibleCount],
  );
  const {
    statusRows = [],
    ranked = [],
    serviceColumns = [],
    cellMap = new Map<string, CellData>(),
    maxStatusCount = 1,
    cellOpacities = new Map<string, number | undefined>(),
  } = heatmap ?? {};

  if (isPending && !isPlaceholderData) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className={containerStyles()}>
        <ErrorBanner error={error} />
      </div>
    );
  }
  if (!data || (!isLoading && data.totalCount === 0))
    return <EmptyState />;

  return (
    <div className={wrapperStyles()}>
      {ranked.length > MAX_VISIBLE_SERVICES && (
        <div className="absolute -top-6 right-0 left-0 z-30 flex items-center justify-end px-2">
          <label className="inline-flex cursor-pointer items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs whitespace-nowrap text-zinc-500 transition-colors hover:bg-black/5">
            Top {Math.min(visibleCount, ranked.length)}
            <Icon
              name={IconName.ChevronsUpDown}
              className="aspect-square h-3.5 w-3.5 opacity-80"
            />
            <select
              className="absolute inset-0 cursor-pointer text-xs opacity-0"
              value={visibleCount}
              onChange={(e) => setVisibleCount(Number(e.target.value))}
            >
              {Array.from(
                { length: Math.ceil(Math.min(ranked.length, 100) / 10) },
                (_, i) => (i + 1) * 10,
              ).map((n) => (
                <option key={n} value={n}>
                  Top {Math.min(n, ranked.length)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div
        className={containerStyles()}
        style={{
          width: `calc(23.5rem + ${serviceColumns.length} * 7.5rem)`,
        }}
      >
        <div className="relative">
          <div className={firstColStyles()}>
            <div className={isLoading ? 'animate-pulse py-1' : 'py-1'}>
              <div className="mb-1.5 flex border-b border-black/30 pb-0.5">
                <div className={statusLabelColStyles({ size: 'lg' })}>
                  {toolbar}
                  <span className="text-sm font-medium text-zinc-300">
                    Total
                  </span>
                </div>
                <div className={barChartColStyles({ size: 'lg' })}>
                  {isLoading ? (
                    <span
                      className={placeholderFillStyles({ className: 'h-4 w-16 rounded bg-white/10' })}
                    />
                  ) : (
                    <span className="text-sm font-semibold text-zinc-200">
                      {data.isEstimate && (
                        <span className="font-normal text-zinc-400">{'> '}</span>
                      )}
                      {formatNumber(data.totalCount, true)}
                    </span>
                  )}
                </div>
              </div>
              {statusRows.map((row) => {
                const statusVariant = row.key as StatusVariant;
                const barPct =
                  maxStatusCount > 0 ? (row.count / maxStatusCount) * 100 : 0;

                return (
                  <div
                    key={row.key}
                    className={firstColStatusRowStyles({
                      isIncluded: row.isIncluded,
                    })}
                    role="button"
                    tabIndex={0}
                    onClick={() => onClick?.({ status: row.key })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClick?.({ status: row.key });
                      }
                    }}
                  >
                    <div className={statusLabelColStyles({ size: 'sm' })}>
                      <span className="truncate text-xs font-medium text-zinc-300">
                        {row.label}
                      </span>
                    </div>
                    <div className={barChartColStyles({ size: 'sm' })}>
                      <div className="flex flex-1 items-center">
                        <div
                          className={barTrackStyles(
                            isLoading
                              ? { loading: true }
                              : { status: statusVariant },
                          )}
                          style={{
                            width: isLoading
                              ? `${PLACEHOLDER_BAR_PCTS[statusRows.indexOf(row)] ?? 30}%`
                              : barPct > 0
                                ? `${barPct}%`
                                : '0%',
                            opacity: !isLoading && barPct === 0 ? 0 : 1,
                          }}
                        />
                      </div>
                      <span className="flex w-12 shrink-0 items-center justify-end">
                        {isLoading ? (
                          <span
                            className={placeholderFillStyles({ className: 'h-3 w-8 rounded bg-white/10' })}
                          />
                        ) : (
                          <span className="text-right text-2xs text-zinc-300 tabular-nums">
                            {data.isEstimate
                              ? formatPercentage(row.count / data.totalCount)
                              : formatNumber(row.count, true)}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="overflow-x-auto overscroll-x-contain [scrollbar-color:rgb(113_113_122/0.4)_transparent] [scrollbar-width:thin]">
            <div className={isLoading ? 'min-w-max w-full animate-pulse py-1.5 pl-91' : 'min-w-max w-full py-1.5 pl-91'}>
              <div className={heatmapRowStyles({ variant: 'header' })}>
                {serviceColumns.map((svc) => (
                  <div
                    key={svc.name}
                    className={serviceHeaderStyles({
                      isOthers: svc.isOthers,
                      shaded: false,
                      className: serviceColStyles(),
                    })}
                    role={svc.isOthers ? undefined : 'button'}
                    tabIndex={svc.isOthers ? undefined : 0}
                    onClick={() => {
                      if (!svc.isOthers) onClick?.({ service: svc.name });
                    }}
                    onKeyDown={(e) => {
                      if (
                        !svc.isOthers &&
                        (e.key === 'Enter' || e.key === ' ')
                      ) {
                        e.preventDefault();
                        onClick?.({ service: svc.name });
                      }
                    }}
                  >
                    <span className="w-full truncate">{svc.name}</span>
                    <span
                      className="w-full truncate text-2xs font-normal text-zinc-400 transition-opacity duration-500"
                      style={{ opacity: isLoading ? 0 : 1 }}
                    >
                      {data.isEstimate
                        ? formatPercentage(svc.count / data.totalCount)
                        : formatNumber(svc.count, true)}
                    </span>
                  </div>
                ))}
              </div>
              {statusRows.map((row) => {
                const statusVariant = row.key as StatusVariant;

                return (
                  <div
                    key={row.key}
                    className={heatmapRowStyles({ variant: 'data' })}
                  >
                    {serviceColumns.map((svc) => {
                      const cellKey = `${svc.name}::${row.key}`;
                      const cell = cellMap.get(cellKey);
                      const fillOpacity = cellOpacities.get(cellKey);
                      const isNonInteractive = Boolean(svc.isOthers);

                      const placeholderBg = getPlaceholderOpacity(cellKey);
                      const cellContent = (
                        <div
                          className={heatCellStyles({
                            shaded: false,
                            isIncluded: isLoading || row.isIncluded,
                            isNonInteractive: isLoading || isNonInteractive,
                          })}
                          role={isLoading || isNonInteractive ? undefined : 'button'}
                          tabIndex={isLoading || isNonInteractive ? undefined : 0}
                          onClick={() => {
                            if (!isLoading && !isNonInteractive) {
                              onClick?.({ status: row.key, service: svc.name });
                            }
                          }}
                          onKeyDown={(e) => {
                            if (
                              !isLoading &&
                              !isNonInteractive &&
                              (e.key === 'Enter' || e.key === ' ')
                            ) {
                              e.preventDefault();
                              onClick?.({ status: row.key, service: svc.name });
                            }
                          }}
                        >
                          <div
                            className={placeholderFillStyles({ className: 'absolute inset-0' })}
                            style={{
                              backgroundColor: isLoading
                                ? `rgb(255 255 255 / ${placeholderBg})`
                                : 'transparent',
                            }}
                          />
                          <div
                            className={heatFillStyles({
                              status: statusVariant,
                            })}
                            style={{ opacity: isLoading ? 0 : (fillOpacity ?? 0) }}
                          />
                          {(cell?.count ?? 0) > 0 ? (
                            <span
                              className={cellCountStyles({
                                prominent: (fillOpacity ?? 0) >= 0.5,
                                status: statusVariant,
                              })}
                              style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 500ms' }}
                            >
                              {data.isEstimate
                                ? formatPercentage((cell?.count ?? 0) / data.totalCount)
                                : formatNumber(cell?.count ?? 0, true)}
                            </span>
                          ) : (
                            <span
                              className={emptyCellStyles()}
                              style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 500ms' }}
                            >
                              –
                            </span>
                          )}
                        </div>
                      );

                      if (isNonInteractive || !cell) {
                        return (
                          <div key={svc.name} className={serviceColStyles()}>
                            {cellContent}
                          </div>
                        );
                      }

                      return (
                        <div key={svc.name} className={serviceColStyles()}>
                          <HoverTooltip
                            content={<CellTooltipContent cell={cell} />}
                          >
                            {cellContent}
                          </HoverTooltip>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
