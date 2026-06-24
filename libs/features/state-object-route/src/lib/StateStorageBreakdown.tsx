import { useGetStateStorageSize } from '@restate/data-access/admin-api-hooks';
import { ErrorBanner } from '@restate/ui/error';
import { HoverTooltip } from '@restate/ui/tooltip';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';
import { Button } from '@restate/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { useRestateContext } from '@restate/features/restate-context';
import {
  formatBytes,
  formatNumber,
  formatPercentageWithoutFraction,
} from '@restate/util/intl';
import { tv } from '@restate/util/styles';
import { useSearchParams } from 'react-router';
import { getStateServiceHref } from './ServiceSelector';

const MAX_VISIBLE_STORAGE_SERVICES = 10;

const STORAGE_SEGMENT_COLORS = [
  '#1d4ed8',
  '#2f6fe1',
  '#4488e9',
  '#5d9ef0',
  '#76b2f5',
  '#91c3f8',
  '#abd3fa',
  '#c2e0fc',
  '#d8ebfd',
  '#e7f3fe',
  '#f3f8ff',
];

const styles = tv({
  slots: {
    root: 'flex w-full flex-col items-stretch gap-2',
    skeleton: 'h-9 w-full animate-pulse rounded-md bg-slate-200',
    empty:
      'h-9 rounded-md border-[1.5px] border-dashed border-gray-300/70 bg-gray-200/70 shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.04)]',
    bar: 'relative flex h-9 w-full items-stretch gap-[2.5px] py-1',
    segmentWrap:
      'h-full min-w-[6px] transition-[flex-grow] duration-300 ease-out',
    segment:
      'relative h-full w-full rounded-md border-[1.5px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_1px_4px_0_rgba(0,0,0,0.15)] transition hover:brightness-[1.03]',
    legend:
      'mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-3 gap-y-1',
    legendItem:
      'flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs text-gray-500 no-underline outline-offset-2 transition',
    legendItemLink: 'hover:bg-black/5 focus-visible:outline-2',
    totalLegendItem:
      'flex min-w-0 items-baseline gap-1.5 px-1.5 py-0.5 text-xs text-gray-500',
    totalValue: 'text-base font-semibold text-gray-700 tabular-nums',
    totalLabel: 'text-xs font-semibold text-gray-600',
    totalMeta: 'text-xs text-gray-400',
    legendSwatch:
      'h-3 w-3 shrink-0 rounded-full border-[1.5px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)]',
    legendName: 'max-w-36 truncate text-xs font-semibold text-gray-600',
    legendMeta: 'text-xs text-gray-400',
    tooltip: 'flex min-w-64 flex-col',
    tooltipTitle: 'text-base! leading-7 font-medium text-gray-300!',
    tooltipMeta: 'text-sm! text-gray-400!',
    tooltipValue: 'text-xl! text-gray-50!',
    tooltipDivider: '-mx-3 my-2 border-t border-white/10',
    tooltipSummary:
      '-mx-2 flex items-baseline gap-1 rounded-lg border-none bg-transparent px-2 py-1 text-inherit! no-underline shadow-none hover:bg-white/10',
    tooltipTable: 'flex min-w-96 flex-col gap-0.5',
    tooltipHead:
      'grid grid-cols-[minmax(0,1fr)_auto_auto_12px] gap-x-3 px-2 text-2xs! font-medium tracking-wide text-gray-400! uppercase',
    tooltipRow:
      '-mx-2 grid grid-cols-[minmax(0,1fr)_auto_auto_12px] items-center gap-x-3 rounded-lg border-none bg-transparent px-2 py-1.5 text-inherit! no-underline shadow-none transition hover:bg-white/10',
    tooltipCell: 'min-w-0 truncate text-0.5xs! text-gray-300!',
    tooltipNumeric: 'text-right text-0.5xs! text-gray-100! tabular-nums',
    tooltipMutedNumeric: 'text-right text-0.5xs! text-gray-300! tabular-nums',
    popoverContent:
      'max-w-7xl [&_[role=dialog]]:bg-transparent [&_[role=dialog]]:shadow-none',
    popoverSurface:
      'max-h-[70vh] overflow-auto rounded-xl border border-zinc-900/80 bg-zinc-800/90 px-3 py-2 text-sm whitespace-pre shadow-[inset_0_1px_0_0_var(--color-gray-500)] drop-shadow-xl backdrop-blur-xl',
  },
});

type StorageService = {
  service_name: string;
  size: number;
};

type StorageSegment = {
  name: string;
  size: number;
  services?: StorageService[];
};

function buildStorageSegments(services: StorageService[]): StorageSegment[] {
  const visible = services
    .slice(0, MAX_VISIBLE_STORAGE_SERVICES)
    .map(({ service_name, size }) => ({
      name: service_name,
      size,
    }));
  const rest = services.slice(MAX_VISIBLE_STORAGE_SERVICES);

  if (rest.length === 0) {
    return visible;
  }

  return [
    ...visible,
    {
      name: 'Other',
      size: rest.reduce((total, service) => total + service.size, 0),
      services: rest,
    },
  ];
}

function StorageTooltipContent({
  segment,
  total,
  getServiceHref,
}: {
  segment: StorageSegment;
  total: number;
  getServiceHref: (serviceName: string) => string;
}) {
  const {
    tooltip,
    tooltipTitle,
    tooltipMeta,
    tooltipValue,
    tooltipDivider,
    tooltipSummary,
    tooltipTable,
    tooltipHead,
    tooltipRow,
    tooltipCell,
    tooltipNumeric,
    tooltipMutedNumeric,
  } = styles();
  const percentage = formatPercentageWithoutFraction(segment.size / total);

  if (!segment.services) {
    return (
      <div className={tooltip()}>
        <div className={tooltipTitle()}>{segment.name}</div>
        <Link
          href={getServiceHref(segment.name)}
          preserveQueryParams={false}
          variant="secondary"
          className={tooltipSummary()}
        >
          <span className={tooltipValue()}>{formatBytes(segment.size)}</span>
          <span className={tooltipMeta()}>State storage</span>
          <span className={tooltipMeta()}>· {percentage}</span>
          <Icon
            name={IconName.ChevronRight}
            className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-500!"
          />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className={tooltip()}>
        <div className={tooltipTitle()}>
          {segment.name} · {formatNumber(segment.services.length)} services
        </div>
        <div className={tooltipSummary()}>
          <span className={tooltipValue()}>{formatBytes(segment.size)}</span>
          <span className={tooltipMeta()}>State storage</span>
          <span className={tooltipMeta()}>· {percentage}</span>
        </div>
      </div>
      <div className={tooltipDivider()} />
      <div className={tooltipTable()}>
        <div className={tooltipHead()}>
          <span>Service</span>
          <span className="text-right">Size</span>
          <span className="text-right">Share</span>
          <span />
        </div>
        {segment.services.map((service) => (
          <Link
            key={service.service_name}
            href={getServiceHref(service.service_name)}
            preserveQueryParams={false}
            variant="secondary"
            className={tooltipRow()}
          >
            <span className={tooltipCell()}>{service.service_name}</span>
            <span className={tooltipNumeric()}>
              {formatBytes(service.size)}
            </span>
            <span className={tooltipMutedNumeric()}>
              {formatPercentageWithoutFraction(service.size / total)}
            </span>
            <Icon
              name={IconName.ChevronRight}
              className="h-3 w-3 shrink-0 text-zinc-500!"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function StateStorageBreakdown() {
  const query = useGetStateStorageSize();
  const [searchParams] = useSearchParams();
  const { baseUrl } = useRestateContext();
  const {
    root,
    skeleton,
    empty,
    bar,
    segmentWrap,
    segment,
    legend,
    legendItem,
    legendItemLink,
    totalLegendItem,
    totalValue,
    totalLabel,
    totalMeta,
    legendSwatch,
    legendName,
    legendMeta,
    popoverContent,
    popoverSurface,
  } = styles();
  const getServiceHref = (service: string) =>
    getStateServiceHref({ baseUrl, service, searchParams });

  const services =
    query.data?.services
      .map((service) => ({
        service_name: service.service_name,
        size: service.size,
      }))
      .filter((service) => service.size > 0)
      .sort(
        (a, b) =>
          b.size - a.size || a.service_name.localeCompare(b.service_name),
      ) ?? [];
  const total = services.reduce((sum, service) => sum + service.size, 0);
  const segments = buildStorageSegments(services);

  if (query.error) {
    return (
      <ErrorBanner
        error={query.error}
        className="w-full rounded-xl text-left"
      />
    );
  }

  if (query.isPending) {
    return <div className={skeleton()} aria-hidden />;
  }

  if (total === 0) {
    return (
      <div className={root()}>
        <div className={empty()} aria-hidden />
        <div className={legendItem()}>No stored state</div>
      </div>
    );
  }

  return (
    <div className={root()}>
      <div
        className={bar()}
        role="img"
        aria-label={`State storage ${formatBytes(total)}`}
      >
        {segments.map((entry, index) => {
          const color =
            STORAGE_SEGMENT_COLORS[
              Math.min(index, STORAGE_SEGMENT_COLORS.length - 1)
            ];
          const href = entry.services ? undefined : getServiceHref(entry.name);

          return (
            <div
              key={`${entry.name}-${index}`}
              className={segmentWrap()}
              style={{ flexGrow: entry.size, flexBasis: 0 }}
            >
              <HoverTooltip
                content={
                  <StorageTooltipContent
                    segment={entry}
                    total={total}
                    getServiceHref={getServiceHref}
                  />
                }
                className="h-full"
                contentClassName="[&&]:break-normal"
                size="lg"
              >
                <div
                  className={segment()}
                  style={{
                    backgroundColor: color,
                    backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, white 22%, ${color}), ${color})`,
                    borderColor: `color-mix(in srgb, black 16%, ${color})`,
                  }}
                >
                  {href && (
                    <Link
                      href={href}
                      preserveQueryParams={false}
                      variant="secondary"
                      aria-label={`View state for ${entry.name}`}
                      className="absolute inset-0 block rounded-[inherit] no-underline outline-none"
                    />
                  )}
                </div>
              </HoverTooltip>
            </div>
          );
        })}
      </div>
      <div className={legend()}>
        <div className={totalLegendItem()}>
          <span className={totalValue()}>{formatBytes(total)}</span>
          <span className={totalLabel()}>State storage</span>
          <span className={totalMeta()}>
            · {formatNumber(services.length)} services
          </span>
        </div>
        {segments.map((entry, index) => {
          const color =
            STORAGE_SEGMENT_COLORS[
              Math.min(index, STORAGE_SEGMENT_COLORS.length - 1)
            ];
          const href = entry.services ? undefined : getServiceHref(entry.name);
          const content = (
            <>
              <span
                className={legendSwatch()}
                style={{
                  backgroundColor: color,
                  borderColor: `color-mix(in srgb, black 16%, ${color})`,
                }}
              />
              <span className={legendName()} title={entry.name}>
                {entry.name}
              </span>
              <span className={legendMeta()}>{formatBytes(entry.size)}</span>
            </>
          );

          if (href) {
            return (
              <Link
                key={`${entry.name}-${index}`}
                href={href}
                preserveQueryParams={false}
                variant="secondary"
                className={legendItem({ class: legendItemLink() })}
              >
                {content}
                <Icon
                  name={IconName.ChevronRight}
                  className="h-3.5 w-3.5 shrink-0 text-gray-400"
                />
              </Link>
            );
          }

          if (entry.services) {
            return (
              <Popover key={`${entry.name}-${index}`}>
                <PopoverTrigger>
                  <Button
                    variant="secondary"
                    className={legendItem({
                      class: `${legendItemLink()} border-none bg-transparent shadow-none`,
                    })}
                  >
                    {content}
                    <Icon
                      name={IconName.ChevronsUpDown}
                      className="h-3.5 w-3.5 shrink-0 text-gray-400"
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={popoverContent()} placement="top">
                  <div className={popoverSurface()}>
                    <StorageTooltipContent
                      segment={entry}
                      total={total}
                      getServiceHref={getServiceHref}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            );
          }

          return (
            <div key={`${entry.name}-${index}`} className={legendItem()}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
