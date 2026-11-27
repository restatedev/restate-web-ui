import type {
  components,
  InvocationStatus,
  JournalEntryV2,
} from '@restate/data-access-admin-api-spec';
import { isCompletedInvocationStatus } from '@restate/data-access-admin-api-hooks';
import { isTargetInvocationEntry } from '@restate/features-invocation-ui';
import { formatDurations } from '@restate/util-intl';
import { getDuration } from '@restate/util-snapshot-time';

export type SendChild = components['schemas']['InvocationStatusResult'];

export type SendTone =
  | 'success'
  | 'danger'
  | 'info'
  | 'warning'
  | 'pending'
  | 'neutral';

const SEND_STATUS_LABEL: Record<InvocationStatus, string> = {
  new: 'queued',
  scheduled: 'scheduled',
  ready: 'queued',
  yielded: 'queued',
  running: 'running',
  suspended: 'suspended',
  succeeded: 'succeeded',
  failed: 'failed',
  cancelled: 'cancelled',
  killed: 'killed',
  'backing-off': 'backing off',
  paused: 'paused',
};

export function getSendInvocationId(entry?: JournalEntryV2) {
  return isTargetInvocationEntry(entry) && entry.type === 'OneWayCall'
    ? entry.invocationId
    : undefined;
}

export function getSendStatusLabel(status: InvocationStatus) {
  return SEND_STATUS_LABEL[status] ?? String(status);
}

export function getSendTone(status?: InvocationStatus): SendTone {
  switch (status) {
    case 'succeeded':
      return 'success';
    case 'failed':
      return 'danger';
    case 'running':
      return 'info';
    case 'backing-off':
    case 'paused':
      return 'warning';
    case 'new':
    case 'ready':
    case 'yielded':
      return 'pending';
    default:
      return 'neutral';
  }
}

export function toTime(date?: string) {
  return date ? new Date(date).getTime() : undefined;
}

function formatSpan(ms: number) {
  return formatDurations(getDuration(Math.max(0, ms)));
}

export interface SendChildSummary {
  status: InvocationStatus;
  createdAt: number;
  runningAt?: number;
  endAt?: number;
  isOpen: boolean;
  label: string;
}

export function getSendChildSummary(
  child: SendChild | undefined,
  now: number,
  invokeTime?: string,
): SendChildSummary | undefined {
  const createdAt = toTime(child?.createdAt);
  if (!child?.status || createdAt === undefined) {
    return undefined;
  }
  const status = child.status;
  const runningAt = toTime(child.runningAt);
  const completedAt = toTime(child.completedAt);
  if (status === 'scheduled') {
    const startsAt = toTime(child.scheduledStartAt) ?? toTime(invokeTime);
    return {
      status,
      createdAt,
      endAt: startsAt,
      isOpen: true,
      label:
        startsAt !== undefined && startsAt > now
          ? `in ${formatSpan(startsAt - now)}`
          : '',
    };
  }
  if (isCompletedInvocationStatus(status)) {
    const endAt = completedAt ?? runningAt ?? createdAt;
    return {
      status,
      createdAt,
      runningAt,
      endAt,
      isOpen: false,
      label:
        completedAt !== undefined
          ? formatSpan(completedAt - (runningAt ?? createdAt))
          : '',
    };
  }
  return {
    status,
    createdAt,
    runningAt,
    isOpen: true,
    label: formatSpan(now - (runningAt ?? createdAt)),
  };
}

const EXISTED_BEFORE_SEND_MS = 1_000;

export interface SendTrailLayout {
  lineEnd: number;
  runAt: number;
  continuesPastEnd: boolean;
  labelSide: 'after' | 'below';
  withStatus: boolean;
  fadeWait: boolean;
}

export function getSendTrailLayout({
  sendAt,
  summary,
  rangeEnd,
  nowMs,
  viewportStart,
  viewportEnd,
}: {
  sendAt: number;
  summary: SendChildSummary;
  rangeEnd: number;
  nowMs: number;
  viewportStart: number;
  viewportEnd: number;
}): SendTrailLayout | undefined {
  if (summary.createdAt < sendAt - EXISTED_BEFORE_SEND_MS) {
    return undefined;
  }
  const openEnd = Math.max(nowMs, summary.runningAt ?? summary.createdAt);
  const trailEnd = summary.isOpen
    ? Math.min(summary.endAt ?? openEnd, openEnd)
    : (summary.endAt ?? sendAt);
  const continuesPastEnd = summary.isOpen || trailEnd > rangeEnd;
  const lineEnd = Math.max(sendAt, Math.min(trailEnd, rangeEnd));
  const runAt =
    summary.runningAt !== undefined
      ? Math.min(Math.max(summary.runningAt, sendAt), lineEnd)
      : sendAt;
  const endInViewport =
    (lineEnd - viewportStart) / Math.max(1, viewportEnd - viewportStart);
  return {
    lineEnd,
    runAt,
    continuesPastEnd,
    labelSide: continuesPastEnd || endInViewport > 0.7 ? 'below' : 'after',
    withStatus: continuesPastEnd || !summary.label,
    fadeWait: continuesPastEnd && runAt >= lineEnd,
  };
}

export function drawsSendTrail(
  entry: JournalEntryV2 | undefined,
  invocation: { invoked_by?: string; created_at?: string } | undefined,
  relatedEntries: JournalEntryV2[] | undefined,
) {
  const sendAt = toTime(entry?.start);
  const createdAt = toTime(invocation?.created_at);
  const isCopiedFromRestart =
    invocation?.invoked_by === 'restart_as_new' &&
    sendAt !== undefined &&
    createdAt !== undefined &&
    sendAt < createdAt;
  return (
    Boolean(getSendInvocationId(entry)) &&
    sendAt !== undefined &&
    !entry?.isRetrying &&
    !isCopiedFromRestart &&
    !relatedEntries?.some((related) => related.type === 'Event: TransientError')
  );
}

export function getSendLabel(
  summary: SendChildSummary,
  layout: SendTrailLayout,
) {
  return layout.withStatus
    ? [getSendStatusLabel(summary.status), summary.label]
        .filter(Boolean)
        .join(' · ')
    : summary.label;
}

function toIso(time?: number) {
  return time === undefined ? undefined : new Date(time).toISOString();
}

export function getChildTooltipEntry(
  entry: JournalEntryV2,
  summary: SendChildSummary | undefined,
  now: number,
): JournalEntryV2 {
  if (!summary) {
    return entry;
  }
  if (summary.status === 'scheduled') {
    return {
      ...entry,
      start: toIso(summary.endAt) ?? entry.start,
      end: undefined,
      isPending: false,
    };
  }
  const startedAt = summary.runningAt ?? summary.createdAt;
  return {
    ...entry,
    start: toIso(startedAt),
    end: toIso(summary.isOpen ? Math.max(now, startedAt) : summary.endAt),
    isPending: false,
  };
}
