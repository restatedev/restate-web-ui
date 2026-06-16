import { toInvocationsHref } from '@restate/util/invocation-links';
import {
  STATUS_ORDER,
  STATUS_STYLE,
  STATUS_LABELS,
  DEFAULT_STYLE,
} from './constants';
import { type StatusEntry } from './useOrderedStatuses';

// A single arc/legend entry. Shared by the gauge (StatusArcEcharts) and the
// legend (StatusLegend `items` mode) so a chart and its legend always read
// from the exact same source of truth.
export type ArcSegment = {
  // Stable key — the status name (e.g. `running`). Used for React keys.
  name: string;
  label: string;
  count: number;
  fillLight: string;
  stroke: string;
  borderType?: 'dashed' | number[];
  borderCap?: 'round';
  // Where clicking the arc slice / legend row navigates.
  href: string;
};

// Terminal statuses — everything else is "in-flight". `failed` already buckets
// cancelled + killed (see STATUS_LABELS.failed and toInvocationsHref expansion).
const TERMINAL_STATUSES = new Set(['succeeded', 'failed']);

const INFLIGHT_ORDER = STATUS_ORDER.filter(
  (name) => !TERMINAL_STATUSES.has(name),
);

export function splitInvocationTotals(byStatus: StatusEntry[]) {
  const map = new Map(byStatus.map((s) => [s.name, s.count]));
  const total = byStatus.reduce((sum, s) => sum + s.count, 0);
  const succeeded = map.get('succeeded') ?? 0;
  const failed = map.get('failed') ?? 0;
  // Everything that isn't terminal is in-flight — derived from the total so
  // any status outside INFLIGHT_ORDER still counts toward the bucket.
  const inFlight = Math.max(0, total - succeeded - failed);
  return { inFlight, succeeded, failed, total };
}

// Completed outcomes (succeeded / failed) for the "Completed" gauge.
export function buildCompletedSegments(
  byStatus: StatusEntry[],
  baseUrl: string,
  linkParams?: URLSearchParams,
): ArcSegment[] {
  const { succeeded, failed } = splitInvocationTotals(byStatus);
  const succeededStyle = STATUS_STYLE.succeeded ?? DEFAULT_STYLE;
  const failedStyle = STATUS_STYLE.failed ?? DEFAULT_STYLE;
  return [
    {
      name: 'succeeded',
      label: STATUS_LABELS.succeeded ?? 'Succeeded',
      count: succeeded,
      fillLight: succeededStyle.fillLight,
      stroke: succeededStyle.stroke,
      href: toInvocationsHref(baseUrl, 'succeeded', {
        existingParams: linkParams,
      }),
    },
    {
      name: 'failed',
      label: STATUS_LABELS.failed ?? 'Failed, Cancelled or Killed',
      count: failed,
      fillLight: failedStyle.fillLight,
      stroke: failedStyle.stroke,
      href: toInvocationsHref(baseUrl, 'failed', { existingParams: linkParams }),
    },
  ];
}

// Per-status breakdown for the "In-flight" gauge.
export function buildInFlightSegments(
  byStatus: StatusEntry[],
  baseUrl: string,
  linkParams?: URLSearchParams,
): ArcSegment[] {
  const map = new Map(byStatus.map((s) => [s.name, s.count]));
  return INFLIGHT_ORDER.map((name) => {
    const style = STATUS_STYLE[name] ?? DEFAULT_STYLE;
    return {
      name,
      label: STATUS_LABELS[name] ?? name,
      count: map.get(name) ?? 0,
      fillLight: style.fillLight,
      stroke: style.stroke,
      borderType: style.borderType,
      borderCap: style.borderCap,
      href: toInvocationsHref(baseUrl, name, { existingParams: linkParams }),
    };
  });
}
