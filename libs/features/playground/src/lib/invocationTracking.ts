import { useEffect, useRef, useState } from 'react';
import { useGetInvocation } from '@restate/data-access-admin-api-hooks';
import { formatCompactDateTime } from '@restate/util-intl';
import type { PlaygroundResult } from './result';

const POLL_DELAYS_MS = [0, 500, 1000, 1000, 2000, 2000, 3000];
const POLL_INTERVAL_MS = 5000;
const POLL_LIMIT_MS = 5 * 60 * 1000;
const NOT_FOUND_GRACE_MS = 3000;
const START_MARGIN_MS = 250;

const STAGES = ['created', 'started', 'completed'] as const;
type Stage = (typeof STAGES)[number];
export type InvocationState =
  | 'succeeded'
  | 'failed'
  | 'running'
  | 'retrying'
  | 'paused'
  | 'scheduled'
  | 'ready';

export type InvocationTool = 'status' | 'output';

type Tracking =
  | { phase: 'tracking'; stage?: Stage }
  | { phase: 'paused'; stage?: Stage }
  | { phase: 'completed'; isFailed: boolean; output?: PlaygroundResult }
  | { phase: 'unavailable'; reply: PlaygroundResult };

function isStage(value: unknown): value is Stage {
  return STAGES.includes(value as Stage);
}

function readStatus(reply: PlaygroundResult) {
  if (reply.kind !== 'response' || reply.status !== 200 || !reply.text) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(reply.text) as {
      stage?: unknown;
      error?: unknown;
    };
    return isStage(parsed.stage)
      ? { stage: parsed.stage, isFailed: Boolean(parsed.error) }
      : undefined;
  } catch {
    return undefined;
  }
}

function isNotFound(reply: PlaygroundResult) {
  return reply.kind === 'response' && reply.status === 404;
}

function invocationState(
  tracking: Tracking,
  isScheduled: boolean,
  adminStatus?: string,
): InvocationState | undefined {
  if (tracking.phase === 'completed') {
    return tracking.isFailed ? 'failed' : 'succeeded';
  }
  if (tracking.phase === 'unavailable') {
    return undefined;
  }
  if (tracking.stage === 'started') {
    if (adminStatus === 'backing-off') {
      return 'retrying';
    }
    return adminStatus === 'paused' ? 'paused' : 'running';
  }
  if (isScheduled) {
    return 'scheduled';
  }
  return tracking.stage === 'created' ? 'ready' : 'running';
}

export function useInvocationTracking({
  invocationId,
  executionTime,
  canTrack,
  runTool,
}: {
  invocationId: string;
  executionTime?: string;
  canTrack: boolean;
  runTool: (
    tool: InvocationTool,
    signal: AbortSignal,
  ) => Promise<PlaygroundResult | undefined>;
}) {
  const [tracking, setTracking] = useState<Tracking>({ phase: 'tracking' });
  const [round, setRound] = useState(0);
  const runToolRef = useRef(runTool);
  const parsedTime = executionTime ? Date.parse(executionTime) : NaN;
  const scheduledAt = Number.isNaN(parsedTime) ? undefined : parsedTime;

  useEffect(() => {
    runToolRef.current = runTool;
  });

  useEffect(() => {
    if (!canTrack) {
      return;
    }
    const controller = new AbortController();
    const startedAt = Date.now();
    const deadline = Math.max(startedAt, scheduledAt ?? 0) + POLL_LIMIT_MS;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    function schedule(attempt: number, delay?: number) {
      timeout = setTimeout(
        () => void poll(attempt),
        delay ?? POLL_DELAYS_MS[attempt] ?? POLL_INTERVAL_MS,
      );
    }

    async function poll(attempt: number) {
      const reply = await runToolRef.current('status', controller.signal);
      if (!reply || controller.signal.aborted) {
        return;
      }
      const status = readStatus(reply);
      if (!status) {
        if (isNotFound(reply) && Date.now() - startedAt < NOT_FOUND_GRACE_MS) {
          schedule(attempt + 1);
        } else {
          setTracking({ phase: 'unavailable', reply });
        }
        return;
      }
      if (status.stage === 'completed') {
        setTracking({ phase: 'completed', isFailed: status.isFailed });
        const output = await runToolRef.current('output', controller.signal);
        if (output && !controller.signal.aborted) {
          setTracking({
            phase: 'completed',
            isFailed: status.isFailed,
            output,
          });
        }
        return;
      }
      const untilStart =
        status.stage === 'created' && scheduledAt !== undefined
          ? scheduledAt - Date.now()
          : 0;
      if (untilStart > POLL_LIMIT_MS || Date.now() > deadline) {
        setTracking({ phase: 'paused', stage: status.stage });
        return;
      }
      setTracking((current) =>
        current.phase === 'tracking' && current.stage === status.stage
          ? current
          : { phase: 'tracking', stage: status.stage },
      );
      schedule(
        attempt + 1,
        untilStart > 0 ? untilStart + START_MARGIN_MS : undefined,
      );
    }

    schedule(0);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [canTrack, round, scheduledAt]);

  const checkAgain = () => {
    setTracking((current) => ({
      phase: 'tracking',
      stage: current.phase === 'paused' ? current.stage : undefined,
    }));
    setRound((current) => current + 1);
  };

  const isScheduled =
    scheduledAt !== undefined &&
    tracking.phase !== 'completed' &&
    tracking.phase !== 'unavailable' &&
    tracking.stage !== 'started';
  const isStarted =
    canTrack &&
    (tracking.phase === 'tracking' || tracking.phase === 'paused') &&
    tracking.stage === 'started';
  const { data: invocation } = useGetInvocation(invocationId, {
    enabled: isStarted,
    refetchInterval:
      isStarted && tracking.phase === 'tracking' ? POLL_INTERVAL_MS : false,
  });
  const state = canTrack
    ? invocationState(
        tracking,
        isScheduled,
        isStarted ? invocation?.status : undefined,
      )
    : undefined;
  const failure =
    state === 'retrying' || state === 'paused'
      ? invocation?.last_failure
      : undefined;
  const startsAt =
    isScheduled && scheduledAt !== undefined
      ? `It starts ${formatCompactDateTime(new Date(scheduledAt))}. `
      : '';

  return {
    tracking,
    state,
    failure,
    startsAt,
    scheduledAt,
    isScheduled,
    checkAgain,
  };
}

export type TrackingState = ReturnType<typeof useInvocationTracking>;
