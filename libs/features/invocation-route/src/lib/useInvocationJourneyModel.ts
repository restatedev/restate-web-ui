import type {
  components,
  JournalEntryV2,
  VqueueEntryStage,
  VqueueSnapshot,
} from '@restate/data-access/admin-api-spec';
import { TERMINAL_INVOCATION_STATUSES } from '@restate/data-access/admin-api-spec';
import {
  getVqueueHeadBlockSummary,
  getVqueueInboxWaitingStartedAt,
  positiveVqueueDurationMilliseconds,
  vqueueDurationPartsMilliseconds,
  vqueueDurationRatio,
} from '@restate/features/vqueue-ui';
import {
  addDurationToDate,
  formatDurations,
  formatMilliseconds,
  normaliseDuration,
  parseISODuration,
} from '@restate/util/intl';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import {
  getJourneyActivityDetails,
  journalEntriesOfType,
} from './InvocationJourneyActivityDetails';
import type {
  InvocationJourneyModel,
  JourneyCurrentStatus,
  JourneyJournalInvocation,
  JourneyTerminalStatus,
} from './InvocationJourneyModel';

export type InvocationJourneySource = components['schemas']['InvocationV2'] & {
  journal?: { version?: number; entries?: JournalEntryV2[] };
};

type InvocationV2 = components['schemas']['InvocationV2'];
type InvocationVqueue = NonNullable<InvocationV2['vqueue']>;

const TERMINAL_STATUS_SET = new Set<string>(TERMINAL_INVOCATION_STATUSES);

function timestampMilliseconds(timestamp?: string) {
  if (!timestamp) return undefined;
  const milliseconds = new Date(timestamp).getTime();
  return Number.isFinite(milliseconds) ? milliseconds : undefined;
}

function durationBetweenMilliseconds(start?: string, end?: string) {
  const startMilliseconds = timestampMilliseconds(start);
  const endMilliseconds = timestampMilliseconds(end);
  if (
    startMilliseconds === undefined ||
    endMilliseconds === undefined ||
    endMilliseconds < startMilliseconds
  ) {
    return undefined;
  }
  return endMilliseconds - startMilliseconds;
}

function completionRetentionEnd(
  completedAt?: string,
  completionRetention?: string,
) {
  if (!completedAt || !completionRetention) return undefined;

  try {
    const duration = normaliseDuration(parseISODuration(completionRetention));
    const isAtCompletion =
      Object.values(duration).reduce((total, value) => total + value, 0) === 0;
    return {
      date: addDurationToDate(completedAt, duration),
      isAtCompletion,
    };
  } catch {
    return undefined;
  }
}

function getEffectiveStage(
  invocation: InvocationV2,
  vqueue: InvocationVqueue,
  data?: VqueueSnapshot,
): VqueueEntryStage {
  if (invocation.completed_at || TERMINAL_STATUS_SET.has(invocation.status)) {
    return 'finished';
  }
  return data?.focusEntry?.stage ?? vqueue.stage;
}

function getCurrentStatus(
  invocation: InvocationV2,
  vqueue: InvocationVqueue,
  stage: VqueueEntryStage,
): JourneyCurrentStatus | undefined {
  if (stage === 'finished') return undefined;
  if (stage === 'suspended') return 'suspended';
  if (stage === 'paused') return 'paused';
  if (stage === 'running') return 'running';
  if (stage === 'inbox') {
    if (invocation.status === 'scheduled' || vqueue.status === 'scheduled') {
      return 'scheduled';
    }
    if (
      invocation.status === 'backing-off' ||
      vqueue.status === 'backing-off'
    ) {
      return 'backing-off';
    }
    if (invocation.status === 'yielded' || vqueue.status === 'yielded') {
      return 'yielded';
    }
    return 'pending';
  }
  return undefined;
}

function getTerminalStatus(
  status: InvocationV2['status'],
): JourneyTerminalStatus | undefined {
  if (
    status === 'succeeded' ||
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'killed'
  ) {
    return status;
  }
  return undefined;
}

function completedActivityCount(total: number, isCurrent: boolean) {
  return Math.max(0, total - (isCurrent ? 1 : 0));
}

export function useInvocationJourneyModel({
  invocation,
  data,
  journalEntries = [],
}: {
  invocation: InvocationJourneySource;
  data?: VqueueSnapshot;
  journalEntries?: JournalEntryV2[];
}): InvocationJourneyModel | undefined {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const focusedInvocation = data?.focusedInvocation;
  const effectiveInvocation = focusedInvocation
    ? { ...invocation, ...focusedInvocation }
    : invocation;
  const journalInvocation = {
    ...effectiveInvocation,
    journal: {
      ...effectiveInvocation.journal,
      entries: journalEntries,
    },
  } as JourneyJournalInvocation;
  const baseVqueue = invocation.vqueue;
  const focusedVqueue = focusedInvocation?.vqueue;
  const vqueue = baseVqueue
    ? ({ ...baseVqueue, ...focusedVqueue } as InvocationVqueue)
    : focusedVqueue;
  const vqueueId =
    vqueue?.vqueue_id ?? effectiveInvocation.vqueue_id ?? invocation.vqueue_id;
  if (!vqueue || !vqueueId) return undefined;

  const stage = getEffectiveStage(effectiveInvocation, vqueue, data);
  const reportedCurrentStatus = getCurrentStatus(
    effectiveInvocation,
    vqueue,
    stage,
  );
  const createdAt = vqueue.created_at ?? effectiveInvocation.created_at;
  const firstRunnableAt =
    data?.focusEntry?.firstRunnableAt ??
    vqueue.first_runnable_at ??
    effectiveInvocation.first_runnable_at;
  const firstAttemptAt =
    data?.focusEntry?.firstAttemptAt ??
    vqueue.first_attempt_at ??
    effectiveInvocation.running_at;
  const latestAttemptAt =
    vqueue.latest_attempt_at ??
    effectiveInvocation.last_start_at ??
    firstAttemptAt;
  const transitionedAt =
    data?.focusEntry?.transitionedAt ??
    vqueue.transitioned_at ??
    effectiveInvocation.modified_at;
  const nextAt =
    data?.focusEntry?.nextAt ??
    vqueue.next_at ??
    effectiveInvocation.next_retry_at ??
    effectiveInvocation.scheduled_start_at;
  const untilNext = nextAt ? durationSinceLastSnapshot(nextAt) : undefined;
  const isFutureScheduled =
    reportedCurrentStatus === 'scheduled' && untilNext?.isPast === false;
  const isWaitingForBackoff =
    reportedCurrentStatus === 'backing-off' && untilNext?.isPast === false;
  const isEligibleAfterBackoff =
    reportedCurrentStatus === 'backing-off' && untilNext?.isPast === true;
  const currentStatus =
    (reportedCurrentStatus === 'scheduled' && !isFutureScheduled) ||
    isEligibleAfterBackoff
      ? 'pending'
      : reportedCurrentStatus;
  const attempts =
    data?.focusEntry?.attempts ??
    vqueue.num_attempts ??
    effectiveInvocation.num_attempts ??
    0;
  const retryAttempts = vqueue.retry_attempts ?? 0;
  const retryCountSinceLastStoredCommand =
    vqueue.retry_count_since_last_stored_command ?? 0;
  const totalYields = data?.focusEntry?.yields ?? 0;
  const totalPauses =
    data?.focusEntry?.pauses ??
    journalEntriesOfType(journalEntries, 'Paused').length;
  const totalSuspensions =
    data?.focusEntry?.suspensions ??
    journalEntriesOfType(journalEntries, 'Suspended').length;
  const totalErrorYields = data?.focusEntry?.errors ?? vqueue.num_errors ?? 0;
  const yields = completedActivityCount(
    totalYields,
    data?.focusEntry?.status === 'yielded' || currentStatus === 'yielded',
  );
  const pauses = completedActivityCount(
    totalPauses,
    stage === 'paused' || currentStatus === 'paused',
  );
  const suspensions = completedActivityCount(
    totalSuspensions,
    stage === 'suspended' || currentStatus === 'suspended',
  );
  const currentAttemptActive = stage === 'running';
  const completedAttemptCount = Math.max(
    0,
    attempts - (currentAttemptActive ? 1 : 0),
  );
  const currentErrorBackoff = stage === 'inbox' && isWaitingForBackoff;
  const errorBackoffs = Math.min(
    completedActivityCount(totalErrorYields, currentErrorBackoff),
    completedAttemptCount,
  );
  const createdDuration = durationSinceLastSnapshot(createdAt);
  const createdAgo = formatDurations(createdDuration);
  const firstRunnableMilliseconds = isFutureScheduled
    ? undefined
    : durationBetweenMilliseconds(createdAt, firstRunnableAt);
  const firstRunnableAfter =
    firstRunnableMilliseconds === undefined
      ? undefined
      : formatMilliseconds(firstRunnableMilliseconds);
  const firstQueueMilliseconds = isFutureScheduled
    ? undefined
    : firstRunnableAt && attempts === 0
      ? vqueueDurationPartsMilliseconds(
          durationSinceLastSnapshot(firstRunnableAt),
        )
      : durationBetweenMilliseconds(firstRunnableAt, firstAttemptAt);
  const queueAverageMilliseconds = positiveVqueueDurationMilliseconds(
    data?.stageAvg.queue,
  );
  const firstQueueWait =
    firstQueueMilliseconds === undefined
      ? undefined
      : {
          duration: formatMilliseconds(firstQueueMilliseconds),
          ratio: vqueueDurationRatio(
            firstQueueMilliseconds,
            queueAverageMilliseconds,
          ),
        };
  const isFinished =
    stage === 'finished' || TERMINAL_STATUS_SET.has(effectiveInvocation.status);
  const completedAt =
    effectiveInvocation.completed_at ??
    (stage === 'finished' ? vqueue.transitioned_at : undefined);
  const terminalStatus = getTerminalStatus(effectiveInvocation.status);
  const terminalAgo = completedAt
    ? formatDurations(durationSinceLastSnapshot(completedAt))
    : undefined;
  const retentionEnd = completionRetentionEnd(
    completedAt,
    effectiveInvocation.completion_retention,
  );
  const retentionDuration = retentionEnd
    ? durationSinceLastSnapshot(retentionEnd.date)
    : undefined;
  const purgeTiming = retentionEnd
    ? retentionEnd.isAtCompletion
      ? 'at completion'
      : `${retentionDuration?.isPast ? '' : 'in '}${formatDurations(
          retentionDuration ?? {},
        )}${retentionDuration?.isPast ? ' ago' : ''}`
    : undefined;
  const finishedElapsedMilliseconds = durationBetweenMilliseconds(
    createdAt,
    completedAt,
  );
  const elapsedMilliseconds = isFinished
    ? finishedElapsedMilliseconds
    : vqueueDurationPartsMilliseconds(createdDuration);
  const elapsed =
    elapsedMilliseconds === undefined
      ? createdAgo
      : formatMilliseconds(elapsedMilliseconds);
  const endToEndAverageMilliseconds = positiveVqueueDurationMilliseconds(
    data?.stageAvg.endToEnd,
  );
  const comparisonRatio = vqueueDurationRatio(
    elapsedMilliseconds,
    endToEndAverageMilliseconds,
  );
  const latestAttemptAgo = latestAttemptAt
    ? formatDurations(durationSinceLastSnapshot(latestAttemptAt))
    : undefined;
  const firstAttemptAgo = firstAttemptAt
    ? formatDurations(durationSinceLastSnapshot(firstAttemptAt))
    : undefined;
  const latestAttemptMilliseconds = durationBetweenMilliseconds(
    firstAttemptAt,
    latestAttemptAt,
  );
  const latestAttemptAfter =
    latestAttemptMilliseconds === undefined
      ? undefined
      : formatMilliseconds(latestAttemptMilliseconds);
  const attemptsDurationMilliseconds =
    attempts === 0
      ? undefined
      : currentAttemptActive && firstAttemptAt
        ? vqueueDurationPartsMilliseconds(
            durationSinceLastSnapshot(firstAttemptAt),
          )
        : durationBetweenMilliseconds(
            firstAttemptAt,
            completedAt ?? transitionedAt ?? latestAttemptAt,
          );
  const attemptsDuration =
    attemptsDurationMilliseconds === undefined
      ? undefined
      : formatMilliseconds(attemptsDurationMilliseconds);
  const currentStatusDuration =
    currentStatus === 'backing-off' && untilNext?.isPast === false
      ? formatDurations(untilNext)
      : currentStatus === 'running' && latestAttemptAt
        ? formatDurations(durationSinceLastSnapshot(latestAttemptAt))
        : (currentStatus === 'paused' || currentStatus === 'suspended') &&
            transitionedAt
          ? formatDurations(durationSinceLastSnapshot(transitionedAt))
          : undefined;
  const isCurrentHead =
    stage !== 'finished' && data?.head.entryId === effectiveInvocation.id;
  const isBlocked = Boolean(
    !isWaitingForBackoff &&
    isCurrentHead &&
    data &&
    (data.status.blocked || data.status.scheduling === 'blocked'),
  );
  const block = isBlocked && data ? getVqueueHeadBlockSummary(data) : undefined;
  const pendingAttempt = block
    ? {
        reason: block.reason,
        duration: block.duration,
        ratio: block.ratio,
      }
    : undefined;
  const runnableIn = isFutureScheduled ? formatDurations(untilNext) : undefined;
  const inboxState =
    !pendingAttempt && stage === 'inbox' && !isFutureScheduled
      ? currentStatus === 'pending' && reportedCurrentStatus !== 'pending'
        ? 'queued'
        : 'pending'
      : undefined;
  const currentInboxStartedAt = getVqueueInboxWaitingStartedAt(
    data?.focusEntry,
    untilNext?.isPast,
  );
  const currentInboxDuration = currentInboxStartedAt
    ? durationSinceLastSnapshot(currentInboxStartedAt)
    : undefined;
  const currentInboxMilliseconds = currentInboxDuration
    ? vqueueDurationPartsMilliseconds(currentInboxDuration)
    : undefined;
  const inbox =
    stage === 'inbox' &&
    currentStatus === 'pending' &&
    data?.focusEntry?.position &&
    currentInboxDuration
      ? {
          position: data.focusEntry.position,
          total: data.counts.inbox,
          waiting: formatDurations(currentInboxDuration),
          ratio: vqueueDurationRatio(
            currentInboxMilliseconds,
            queueAverageMilliseconds,
          ),
        }
      : undefined;

  return {
    key: effectiveInvocation.id,
    createdAgo,
    firstRunnableAfter,
    runnableIn,
    attempts,
    retryAttempts,
    firstAttemptAgo,
    latestAttemptAgo,
    latestAttemptAfter,
    attemptsDuration,
    activity: { errorBackoffs, yields, pauses, suspensions },
    activityDetails: getJourneyActivityDetails(
      errorBackoffs,
      pauses,
      suspensions,
      journalEntries,
      journalInvocation,
    ),
    firstQueueWait,
    currentStatus,
    currentStatusInvocation: currentStatus
      ? {
          ...effectiveInvocation,
          status: currentStatus,
          isRetrying:
            currentStatus === 'running'
              ? retryCountSinceLastStoredCommand > 0
              : effectiveInvocation.isRetrying,
          retry_count:
            currentStatus === 'running'
              ? retryCountSinceLastStoredCommand
              : effectiveInvocation.retry_count,
        }
      : undefined,
    currentAttemptActive,
    currentStatusDuration,
    terminal: terminalStatus
      ? {
          status: terminalStatus,
          timing: terminalAgo ? `${terminalAgo} ago` : undefined,
        }
      : undefined,
    purge: purgeTiming ? { timing: purgeTiming } : undefined,
    pendingAttempt,
    inboxState,
    comparison: {
      elapsed: `${elapsed}${isFinished ? '' : ' so far'}`,
      ratio: comparisonRatio,
      isFinished,
    },
    inbox,
    inboxSnapshot: data,
  };
}
