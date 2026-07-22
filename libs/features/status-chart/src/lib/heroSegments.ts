import {
  toCompletedInvocationsHref,
  toInFlightPlusScheduledInvocationsHref,
  toInvocationsHref,
} from '@restate/util/invocation-links';
import {
  DEFAULT_STYLE,
  INBOX_INVOCATION_STATUSES,
  STATUS_LABELS,
  STATUS_STYLE,
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
  statuses?: string[];
  // Where clicking the arc slice / legend row navigates.
  href: string;
};

const INFLIGHT_ORDER = [
  'inbox',
  'scheduled',
  'pending',
  'ready',
  'yielded',
  'ready-yielded-backing-off',
  'backing-off',
  'running',
  'suspended',
  'paused',
];

const GRANULAR_INBOX_STATUSES = new Set<string>(INBOX_INVOCATION_STATUSES);
const INFLIGHT_STAGE_ORDER = ['inbox', 'running', 'suspended', 'paused'];

function toArcSegment(entry: StatusEntry, href: string): ArcSegment {
  const style = STATUS_STYLE[entry.name] ?? DEFAULT_STYLE;
  return {
    name: entry.name,
    label: entry.label ?? STATUS_LABELS[entry.name] ?? entry.name,
    count: entry.count,
    fillLight: style.fillLight,
    stroke: style.stroke,
    borderType: style.borderType,
    borderCap: style.borderCap,
    statuses: entry.statuses,
    href,
  };
}

export function splitInvocationTotals(byStatus: StatusEntry[]) {
  const map = new Map(byStatus.map((s) => [s.name, s.count]));
  const total = byStatus.reduce((sum, s) => sum + s.count, 0);
  const finished = map.get('finished') ?? 0;
  const succeeded = map.get('succeeded') ?? 0;
  const failed = map.get('failed') ?? 0;
  const cancelled = map.get('cancelled') ?? 0;
  const killed = map.get('killed') ?? 0;
  // Everything that isn't terminal is in-flight — derived from the total so
  // any status outside INFLIGHT_ORDER still counts toward the bucket.
  const inFlight = Math.max(
    0,
    total - finished - succeeded - failed - cancelled - killed,
  );
  return { inFlight, finished, succeeded, failed, cancelled, killed, total };
}

// Completed outcomes for the "Completed" gauge.
export function buildCompletedSegments(
  byStatus: StatusEntry[],
  baseUrl: string,
  linkParams?: URLSearchParams,
): ArcSegment[] {
  const { finished, succeeded, failed, cancelled, killed } =
    splitInvocationTotals(byStatus);
  const groupedFailure = byStatus.find((status) => {
    const statuses = status.statuses ?? [];
    return (
      status.name === 'failed' &&
      statuses.includes('cancelled') &&
      statuses.includes('killed')
    );
  });
  if (finished > 0) {
    const finishedStyle = STATUS_STYLE.finished ?? DEFAULT_STYLE;
    return [
      {
        name: 'finished',
        label: STATUS_LABELS.finished ?? 'Completed',
        count: finished,
        fillLight: finishedStyle.fillLight,
        stroke: finishedStyle.stroke,
        href: toCompletedInvocationsHref(baseUrl, {
          existingParams: linkParams,
        }),
      },
    ];
  }
  const succeededStyle = STATUS_STYLE.succeeded ?? DEFAULT_STYLE;
  const failedStyle = STATUS_STYLE.failed ?? DEFAULT_STYLE;
  const cancelledStyle = STATUS_STYLE.cancelled ?? DEFAULT_STYLE;
  const killedStyle = STATUS_STYLE.killed ?? DEFAULT_STYLE;
  const succeededSegment: ArcSegment = {
    name: 'succeeded',
    label: STATUS_LABELS.succeeded ?? 'Succeeded',
    count: succeeded,
    fillLight: succeededStyle.fillLight,
    stroke: succeededStyle.stroke,
    href: toInvocationsHref(baseUrl, 'succeeded', {
      existingParams: linkParams,
    }),
  };
  if (groupedFailure) {
    return [
      succeededSegment,
      {
        name: 'failed',
        label: groupedFailure.label ?? 'Failed, cancelled or killed',
        count: failed,
        fillLight: failedStyle.fillLight,
        stroke: failedStyle.stroke,
        statuses: groupedFailure.statuses,
        href: toInvocationsHref(baseUrl, 'failed', {
          existingParams: linkParams,
        }),
      },
    ];
  }
  return [
    succeededSegment,
    {
      name: 'failed',
      label: STATUS_LABELS.failed ?? 'Failed',
      count: failed,
      fillLight: failedStyle.fillLight,
      stroke: failedStyle.stroke,
      href: toInvocationsHref(baseUrl, 'failed', {
        expandFailed: false,
        existingParams: linkParams,
      }),
    },
    {
      name: 'cancelled',
      label: STATUS_LABELS.cancelled ?? 'Cancelled',
      count: cancelled,
      fillLight: cancelledStyle.fillLight,
      stroke: cancelledStyle.stroke,
      href: toInvocationsHref(baseUrl, 'cancelled', {
        existingParams: linkParams,
      }),
    },
    {
      name: 'killed',
      label: STATUS_LABELS.killed ?? 'Killed',
      count: killed,
      fillLight: killedStyle.fillLight,
      stroke: killedStyle.stroke,
      href: toInvocationsHref(baseUrl, 'killed', {
        existingParams: linkParams,
      }),
    },
  ];
}

// Per-status breakdown for the "In-flight" gauge.
export function buildInFlightSegments(
  byStatus: StatusEntry[],
  baseUrl: string,
  linkParams?: URLSearchParams,
): ArcSegment[] {
  const entries = new Map(byStatus.map((status) => [status.name, status]));
  const hasGranularInboxStatuses = byStatus.some((status) =>
    GRANULAR_INBOX_STATUSES.has(status.name),
  );
  return INFLIGHT_ORDER.filter(
    (name) => name !== 'inbox' || !hasGranularInboxStatuses,
  )
    .map((name) => {
      const entry = entries.get(name);
      const style = STATUS_STYLE[name] ?? DEFAULT_STYLE;
      return {
        name,
        label: entry?.label ?? STATUS_LABELS[name] ?? name,
        count: entry?.count ?? 0,
        fillLight: style.fillLight,
        stroke: style.stroke,
        borderType: style.borderType,
        borderCap: style.borderCap,
        statuses: entry?.statuses,
        href:
          name === 'inbox'
            ? toInFlightPlusScheduledInvocationsHref(baseUrl, {
                existingParams: linkParams,
              })
            : toInvocationsHref(baseUrl, name, {
                existingParams: linkParams,
              }),
      };
    })
    .filter(
      (segment) =>
        !['ready', 'yielded', 'ready-yielded-backing-off'].includes(
          segment.name,
        ) || segment.count > 0,
    );
}

export function buildInFlightStageSegments(
  byStage: StatusEntry[],
  baseUrl: string,
  linkParams?: URLSearchParams,
): ArcSegment[] {
  const entries = new Map(byStage.map((stage) => [stage.name, stage]));
  return INFLIGHT_STAGE_ORDER.map((name) => {
    const entry = entries.get(name) ?? { name, count: 0 };
    const href = toInvocationsHref(baseUrl, name, {
      existingParams: linkParams,
    });
    return toArcSegment(entry, href);
  });
}

export function buildInboxBreakdownSegments(
  byStatus: StatusEntry[],
  getHref: (statusName: string) => string,
): ArcSegment[] {
  return byStatus
    .filter((entry) => {
      const statuses = entry.statuses ?? [entry.name];
      return (
        entry.name !== 'inbox' &&
        statuses.some((status) => GRANULAR_INBOX_STATUSES.has(status))
      );
    })
    .filter(
      (entry) => !['ready', 'yielded'].includes(entry.name) || entry.count > 0,
    )
    .map((entry) => toArcSegment(entry, getHref(entry.name)));
}
