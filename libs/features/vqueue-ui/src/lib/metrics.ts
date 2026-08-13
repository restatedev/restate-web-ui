import type { VqueueSnapshot } from '@restate/data-access/admin-api-spec';
import {
  formatDurations,
  formatNumber,
  normaliseDuration,
  parseISODuration,
} from '@restate/util/intl';

const MAX_AVERAGE_RATIO = 100;
const MIN_COMPARABLE_AVERAGE_MILLISECONDS = 1;

const RESOURCE_LABELS: Record<string, string> = {
  lock: 'object lock',
  'invoker-concurrency': 'invoker concurrency',
  'invoker-throttling': 'invoker throttling',
  'invoker-memory': 'invoker memory',
  'deployment-concurrency': 'deployment concurrency',
  'limit-key-concurrency': 'concurrency rule',
  concurrency_rules: 'concurrency rule',
  throttling_rules: 'throttling rule',
  invoker_concurrency: 'invoker concurrency',
  invoker_throttling: 'invoker throttling',
  invoker_memory: 'invoker memory',
  deployment_concurrency: 'deployment concurrency',
};

const BLOCKED_GATE_ALIASES: Record<string, string> = {
  'limit-key-concurrency': 'concurrency_rules',
  'invoker-concurrency': 'invoker_concurrency',
  'invoker-throttling': 'invoker_throttling',
  'invoker-memory': 'invoker_memory',
  'deployment-concurrency': 'deployment_concurrency',
};

export function formatVqueueDuration(duration?: string) {
  if (!duration) return undefined;
  try {
    return formatDurations(normaliseDuration(parseISODuration(duration)));
  } catch {
    return duration;
  }
}

export function vqueueDurationPartsMilliseconds(
  duration: Parameters<typeof normaliseDuration>[0],
) {
  const value = normaliseDuration(duration);
  return (
    ((((value.days ?? 0) * 24 + (value.hours ?? 0)) * 60 +
      (value.minutes ?? 0)) *
      60 +
      (value.seconds ?? 0)) *
      1000 +
    (value.milliseconds ?? 0)
  );
}

export function vqueueDurationMilliseconds(duration?: string) {
  if (!duration) return undefined;
  try {
    return vqueueDurationPartsMilliseconds(parseISODuration(duration));
  } catch {
    return undefined;
  }
}

export function positiveVqueueDurationMilliseconds(duration?: string) {
  const milliseconds = vqueueDurationMilliseconds(duration);
  return milliseconds !== undefined &&
    milliseconds >= MIN_COMPARABLE_AVERAGE_MILLISECONDS
    ? milliseconds
    : undefined;
}

export function getVqueueInboxWaitingStartedAt(
  entry: VqueueSnapshot['focusEntry'],
  nextAtIsPast: boolean | undefined,
) {
  if (
    nextAtIsPast &&
    entry?.nextAt &&
    (entry.status === 'backing-off' || entry.status === 'scheduled')
  ) {
    return entry.nextAt;
  }
  return entry?.transitionedAt ?? entry?.firstRunnableAt;
}

export function vqueueDurationRatio(
  currentMilliseconds: number | undefined,
  averageMilliseconds: number | undefined,
) {
  if (
    currentMilliseconds === undefined ||
    averageMilliseconds === undefined ||
    averageMilliseconds <= 0
  ) {
    return undefined;
  }
  const ratio = currentMilliseconds / averageMilliseconds;
  const roundedRatio = Math.round(ratio * 10) / 10;
  if (roundedRatio >= MAX_AVERAGE_RATIO) return `≥${MAX_AVERAGE_RATIO}`;
  return ratio < 0.1 ? '<0.1' : formatNumber(roundedRatio);
}

export function getVqueueGateLabel(gate: string) {
  return (
    RESOURCE_LABELS[gate] ?? gate.replaceAll('_', ' ').replaceAll('-', ' ')
  );
}

export function getVqueueBlockedReason(data: VqueueSnapshot) {
  const key = data.status.blockedResource?.resource ?? data.status.blockedOn;
  return key ? getVqueueGateLabel(key) : 'resource';
}

export function matchingVqueueBlockedDuration(
  data: VqueueSnapshot,
  durations: VqueueSnapshot['head']['nowBlocks'],
  fallbackToFirst = false,
) {
  const gates = [
    data.status.blockedOn,
    data.status.blockedResource?.resource,
  ].flatMap((gate) => (gate ? [gate, BLOCKED_GATE_ALIASES[gate] ?? gate] : []));
  return (
    durations.find((duration) => gates.includes(duration.gate)) ??
    (fallbackToFirst ? durations.at(0) : undefined)
  );
}

export function getVqueueHeadBlockSummary(data: VqueueSnapshot) {
  const current = matchingVqueueBlockedDuration(
    data,
    data.head.nowBlocks,
    true,
  );
  const average = matchingVqueueBlockedDuration(data, data.head.avgBlocks);
  const currentMilliseconds = vqueueDurationMilliseconds(current?.duration);
  const averageMilliseconds = positiveVqueueDurationMilliseconds(
    average?.duration,
  );
  return {
    reason: getVqueueBlockedReason(data),
    duration: formatVqueueDuration(current?.duration),
    average: averageMilliseconds
      ? formatVqueueDuration(average?.duration)
      : undefined,
    ratio: vqueueDurationRatio(currentMilliseconds, averageMilliseconds),
  };
}
