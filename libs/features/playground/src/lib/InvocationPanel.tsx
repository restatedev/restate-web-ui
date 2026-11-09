import { useEffect, useRef, useState } from 'react';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { Spinner } from '@restate/ui-loading';
import { useRestateContext } from '@restate/features-restate-context';
import { formatCompactDateTime } from '@restate/util-intl';
import { tv } from '@restate/util-styles';
import { ResponseView, type PlaygroundResult } from './ResponseView';

const POLL_DELAYS_MS = [0, 500, 1000, 1000, 2000, 2000, 3000];
const POLL_INTERVAL_MS = 5000;
const POLL_LIMIT_MS = 5 * 60 * 1000;
const NOT_FOUND_GRACE_MS = 3000;
const START_MARGIN_MS = 250;

const STAGES = ['created', 'started', 'completed'] as const;
type Stage = (typeof STAGES)[number];
type InvocationState =
  | 'succeeded'
  | 'failed'
  | 'running'
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

const STATE_TITLE: Record<InvocationState, string> = {
  succeeded: 'Invocation succeeded',
  failed: 'Invocation failed',
  running: 'Invocation is running',
  scheduled: 'Invocation is scheduled',
  ready: 'Invocation is waiting to start',
};

const STATE_ICON: Record<Exclude<InvocationState, 'running'>, IconName> = {
  succeeded: IconName.Check,
  failed: IconName.X,
  scheduled: IconName.Timer,
  ready: IconName.CircleDashed,
};

const stateStyles = tv({
  slots: {
    badge: 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
    glyph: 'h-3 w-3',
  },
  variants: {
    state: {
      succeeded: { badge: 'bg-success text-inverse', glyph: 'stroke-3' },
      failed: { badge: 'bg-danger text-inverse', glyph: 'stroke-3' },
      running: { badge: 'text-info', glyph: 'h-4 w-4' },
      scheduled: { badge: 'bg-muted text-tertiary', glyph: 'h-3.5 w-3.5' },
      ready: { badge: 'bg-muted text-tertiary', glyph: 'h-3.5 w-3.5' },
    },
  },
});

function StateIcon({ state }: { state: InvocationState }) {
  const styles = stateStyles({ state });
  return (
    <span className={styles.badge()}>
      {state === 'running' ? (
        <Spinner className={styles.glyph()} />
      ) : (
        <Icon name={STATE_ICON[state]} className={styles.glyph()} />
      )}
    </span>
  );
}

function invocationState(
  tracking: Tracking,
  isScheduled: boolean,
): InvocationState | undefined {
  if (tracking.phase === 'completed') {
    return tracking.isFailed ? 'failed' : 'succeeded';
  }
  if (tracking.phase === 'unavailable') {
    return undefined;
  }
  if (tracking.stage === 'started') {
    return 'running';
  }
  if (isScheduled) {
    return 'scheduled';
  }
  return tracking.stage === 'created' ? 'ready' : 'running';
}

export function OpenInvocationLink({ invocationId }: { invocationId: string }) {
  const { baseUrl } = useRestateContext();
  return (
    <Link
      variant="secondary-button"
      href={`${baseUrl}/invocations/${invocationId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5"
    >
      Open invocation
      <Icon name={IconName.ExternalLink} className="h-3.5 w-3.5" />
    </Link>
  );
}

export function InvocationPanel({
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

  const isScheduled = scheduledAt !== undefined && scheduledAt > Date.now();
  const state = canTrack ? invocationState(tracking, isScheduled) : undefined;
  const startsAt =
    isScheduled && scheduledAt !== undefined
      ? `It starts ${formatCompactDateTime(new Date(scheduledAt))}. `
      : '';

  return (
    <div className="flex flex-col rounded-xl border bg-surface">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
        <div className="flex min-w-0 flex-auto items-start gap-2">
          {state && <StateIcon state={state} />}
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium text-primary">
              {state ? STATE_TITLE[state] : 'Invocation'}
            </span>
            <span className="font-mono text-2xs break-all text-muted select-all">
              {invocationId}
            </span>
          </div>
        </div>
        <OpenInvocationLink invocationId={invocationId} />
      </div>
      {!canTrack ? (
        <p className="border-t border-muted px-3 py-2.5 text-xs text-muted">
          {startsAt}It runs in the background. Open it to follow its progress.
        </p>
      ) : tracking.phase === 'tracking' ? (
        <p className="border-t border-muted px-3 py-2.5 text-xs text-muted">
          {startsAt}The result shows up here when it finishes.
        </p>
      ) : tracking.phase === 'paused' ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-muted px-3 py-2.5">
          <p className="text-xs text-muted">
            {startsAt || 'Stopped checking after 5 minutes.'}
          </p>
          <Button
            variant="secondary"
            className="ml-auto rounded-lg px-2.5 py-1 text-xs"
            onClick={checkAgain}
          >
            Check again
          </Button>
        </div>
      ) : tracking.phase === 'unavailable' ? (
        <div className="flex flex-col gap-2 border-t border-muted px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted">
              Couldn’t get the status of this invocation.
            </p>
            <Button
              variant="secondary"
              className="ml-auto rounded-lg px-2.5 py-1 text-xs"
              onClick={checkAgain}
            >
              Try again
            </Button>
          </div>
          <ResponseView result={tracking.reply} />
        </div>
      ) : tracking.output ? (
        <div className="flex flex-col gap-2 border-t border-muted px-3 py-2.5">
          <span className="text-xs font-medium text-secondary">Result</span>
          <ResponseView result={tracking.output} />
        </div>
      ) : null}
    </div>
  );
}
