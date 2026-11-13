import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { useRestateContext } from '@restate/features-restate-context';
import { formatMilliseconds } from '@restate/util-intl';
import { formatJson } from '@restate/util-openapi';
import { tv } from '@restate/util-styles';
import {
  useInvocationTracking,
  type InvocationState,
} from './invocationTracking';
import type { PlaygroundResult } from './result';
import { Hint, RESULT_HINT } from './floating';
import { NOT_READY_STATUS, statusText } from './status';
import { Steps } from './Steps';
import type { RunRecord } from './useRunner';
import type { OperationRun } from './useHandlerRun';

type RunView =
  | { phase: 'sending' }
  | { phase: 'unreachable'; message: string }
  | { phase: 'rejected'; message: string; result: PlaygroundResult }
  | { phase: 'accepted'; invocationId: string }
  | {
      phase: 'invocation';
      invocationId: string;
      state?: InvocationState;
      isDone: boolean;
      isLive: boolean;
      isUnknown: boolean;
      isFailed: boolean;
      output?: PlaygroundResult;
      failure?: string;
      note?: string;
      checkAgain?: () => void;
    }
  | {
      phase: 'answered';
      isFailed: boolean;
      result: PlaygroundResult;
      invocationId?: string;
      message?: string;
    };

function errorMessage(text?: string) {
  if (!text) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return typeof parsed['message'] === 'string'
      ? parsed['message']
      : undefined;
  } catch {
    return undefined;
  }
}

function errorSource(text?: string) {
  try {
    const parsed = JSON.parse(text ?? '') as Record<string, unknown>;
    return typeof parsed['source'] === 'string' ? parsed['source'] : undefined;
  } catch {
    return undefined;
  }
}

function replyMessage(reply: PlaygroundResult) {
  if (reply.kind === 'error') {
    return reply.message;
  }
  return (
    errorMessage(reply.text) ??
    `Restate answered ${[reply.status, statusText(reply.status)].filter(Boolean).join(' ')}`
  );
}

function useRunView(
  run: RunRecord | undefined,
  runner: OperationRun['runner'],
): RunView | undefined {
  const result = run?.result;
  const sentId =
    result?.kind === 'response' && result.status === 202
      ? result.invocationId
      : undefined;
  const tracking = useInvocationTracking({
    invocationId: sentId ?? '',
    executionTime:
      result?.kind === 'response' ? result.executionTime : undefined,
    canTrack: Boolean(sentId) && runner.canTrack,
    runTool: (kind, signal) =>
      sentId
        ? runner.runTool(kind, sentId, signal)
        : Promise.resolve(undefined),
  });

  if (!run) {
    return undefined;
  }
  if (run.isRunning || !result) {
    return { phase: 'sending' };
  }
  if (result.kind === 'error') {
    return { phase: 'unreachable', message: result.message };
  }
  if (sentId && !runner.canTrack) {
    return { phase: 'accepted', invocationId: sentId };
  }
  if (sentId) {
    const phase = tracking.tracking.phase;
    const reply =
      tracking.tracking.phase === 'unavailable'
        ? tracking.tracking.reply
        : undefined;
    const output =
      tracking.tracking.phase === 'completed'
        ? tracking.tracking.output
        : undefined;
    const failedMessage =
      tracking.state === 'failed' && output?.kind === 'response'
        ? errorMessage(output.text)
        : undefined;
    return {
      phase: 'invocation',
      invocationId: sentId,
      state: tracking.state,
      isDone: phase === 'completed',
      isLive: phase === 'tracking' && tracking.state !== 'scheduled',
      isUnknown: phase === 'unavailable',
      isFailed: tracking.state === 'failed',
      output: failedMessage ? undefined : output,
      failure:
        tracking.failure ?? failedMessage ?? (reply && replyMessage(reply)),
      note:
        phase === 'paused'
          ? tracking.startsAt || 'Stopped checking after 5 minutes.'
          : phase === 'unavailable'
            ? 'Couldn’t get the status of this invocation.'
            : tracking.startsAt || undefined,
      checkAgain:
        phase === 'paused' || phase === 'unavailable'
          ? tracking.checkAgain
          : undefined,
    };
  }
  if (result.status === NOT_READY_STATUS) {
    return {
      phase: 'answered',
      isFailed: false,
      result,
      invocationId: result.invocationId,
    };
  }
  if (
    result.status >= 400 &&
    !result.invocationId &&
    errorSource(result.text) !== 'invocation'
  ) {
    return {
      phase: 'rejected',
      result,
      message: replyMessage(result),
    };
  }
  return {
    phase: 'answered',
    isFailed: result.status >= 400,
    result,
    invocationId: result.invocationId,
    message: result.status >= 400 ? errorMessage(result.text) : undefined,
  };
}

const STATE_LABEL: Record<InvocationState, string> = {
  succeeded: 'Succeeded',
  failed: 'Failed',
  running: 'Running',
  retrying: 'Retrying',
  paused: 'Paused',
  scheduled: 'Scheduled',
  ready: 'Waiting to start',
};

type Tone = 'neutral' | 'running' | 'success' | 'danger' | 'warning';

function viewTone(view: RunView): Tone {
  switch (view.phase) {
    case 'sending':
      return 'running';
    case 'unreachable':
    case 'rejected':
      return 'danger';
    case 'accepted':
      return 'neutral';
    case 'answered':
      if (isNotReady(view.result)) {
        return 'neutral';
      }
      return view.isFailed ? 'danger' : 'success';
    case 'invocation':
      if (view.isUnknown) return 'neutral';
      if (view.state === 'succeeded') return 'success';
      if (view.state === 'failed') return 'danger';
      if (view.state === 'retrying' || view.state === 'paused')
        return 'warning';
      return 'running';
  }
}

function isNotReady(result: PlaygroundResult) {
  return result.kind === 'response' && result.status === NOT_READY_STATUS;
}

function viewTitle(view: RunView) {
  switch (view.phase) {
    case 'sending':
      return 'Sending…';
    case 'unreachable':
      return 'Couldn’t reach Restate';
    case 'rejected':
      return 'Not accepted';
    case 'accepted':
      return 'Accepted';
    case 'answered':
      if (isNotReady(view.result)) {
        return 'Not finished yet';
      }
      return view.isFailed ? 'Failed' : 'Succeeded';
    case 'invocation':
      if (view.state) return STATE_LABEL[view.state];
      return view.isUnknown ? 'Status unknown' : 'Starting…';
  }
}

function viewValue(view: RunView) {
  if (view.phase === 'answered') {
    return view.isFailed && view.message ? undefined : view.result;
  }
  if (view.phase === 'invocation') {
    return view.output;
  }
  return undefined;
}

function viewMessage(view: RunView) {
  switch (view.phase) {
    case 'unreachable':
      return `${view.message}. Check that Restate is running and reachable from this browser.`;
    case 'rejected':
      return view.message;
    case 'answered':
      return view.message;
    case 'invocation':
      return view.failure;
    default:
      return undefined;
  }
}

function viewInvocationId(view?: RunView) {
  if (view?.phase === 'invocation' || view?.phase === 'accepted') {
    return view.invocationId;
  }
  if (view?.phase === 'answered') {
    return view.invocationId;
  }
  return undefined;
}

const dotStyles = tv({
  base: 'inline-block h-2 w-2 shrink-0 rounded-full',
  variants: {
    tone: {
      neutral: 'bg-neutral',
      running: 'animate-pulse bg-info-vivid',
      success: 'bg-success-vivid',
      danger: 'bg-danger-vivid',
      warning: 'bg-warning-vivid',
    },
  },
});

function StatusDot({ tone }: { tone: Tone }) {
  return <span className={dotStyles({ tone })} />;
}

const valueStyles = tv({
  base: 'max-h-64 overflow-auto rounded-lg border border-inset bg-inset px-2.5 py-2 font-mono text-xs break-all whitespace-pre-wrap text-secondary',
});

function ValueBlock({
  result,
  className,
}: {
  result: PlaygroundResult;
  className?: string;
}) {
  if (result.kind === 'error') {
    return null;
  }
  if (result.text === undefined || result.text === '') {
    return (
      <p className="text-xs text-muted">
        {result.bytes.length === 0
          ? 'The handler returned nothing.'
          : `Binary result, ${result.bytes.length} bytes.`}
      </p>
    );
  }
  return (
    <pre className={valueStyles({ className })}>
      {formatJson(result.text) ?? result.text}
    </pre>
  );
}

function invocationHref(baseUrl: string, invocationId: string) {
  return `${baseUrl}/invocations/${invocationId}`;
}

const openStyles = tv({
  base: 'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm',
  variants: {
    isPulsing: { true: 'animate-pulseButton', false: '' },
  },
});

function OpenInvocation({
  invocationId,
  variant = 'secondary-button',
  isPulsing = false,
  children = 'Open invocation',
  className,
}: {
  invocationId: string;
  variant?: 'button' | 'secondary-button';
  isPulsing?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const { baseUrl } = useRestateContext();
  return (
    <Link
      variant={variant}
      href={invocationHref(baseUrl, invocationId)}
      target="_blank"
      rel="noopener noreferrer"
      className={openStyles({ isPulsing, className })}
    >
      {children}
      <Icon name={IconName.ExternalLink} className="h-3.5 w-3.5" />
    </Link>
  );
}

function InvocationIdLink({ invocationId }: { invocationId: string }) {
  const { baseUrl } = useRestateContext();
  return (
    <Link
      href={invocationHref(baseUrl, invocationId)}
      target="_blank"
      rel="noopener noreferrer"
      variant="secondary"
      className="inline-flex max-w-full min-w-0 items-center gap-1 font-mono text-2xs text-muted hover:text-secondary"
    >
      <span className="min-w-0 truncate">{invocationId}</span>
      <Icon name={IconName.ExternalLink} className="h-3 w-3 shrink-0" />
    </Link>
  );
}

const runResultStyles = tv({
  slots: {
    root: 'flex min-w-0 flex-col',
    box: 'flex min-w-0 flex-col rounded-xl border bg-surface shadow-xs',
    footer: 'flex flex-wrap items-center gap-2',
    trailing: 'flex items-center gap-2',
  },
  variants: {
    variant: {
      full: { root: 'scroll-mb-6', box: 'gap-3 p-4' },
      compact: { root: 'gap-3', box: 'gap-2.5 p-3' },
    },
    hasActions: { true: { trailing: 'ml-auto' }, false: {} },
  },
});

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

function lookupTitle(view: RunView, title: string) {
  if (view.phase === 'rejected') {
    return view.result.kind === 'response' && view.result.status === 404
      ? 'Not found'
      : 'Failed';
  }
  return title === 'Succeeded' ? 'Done' : title;
}

export function RunResult({
  record,
  runner,
  variant = 'full',
  isLookup = false,
  actions,
}: {
  record: RunRecord;
  runner: OperationRun['runner'];
  variant?: 'full' | 'compact';
  isLookup?: boolean;
  actions?: ReactNode;
}) {
  const view = useRunView(record, runner);
  const ref = useRef<HTMLElement>(null);
  const startedRunning = useRef(record.isRunning);
  useEffect(() => {
    if (variant === 'full' && startedRunning.current) {
      ref.current?.scrollIntoView({
        block: 'nearest',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
  }, [variant]);
  if (!view) {
    return null;
  }
  const styles = runResultStyles({ variant, hasActions: Boolean(actions) });
  const invocationId = viewInvocationId(view);
  const value = viewValue(view);
  const message = viewMessage(view);
  const title = viewTitle(view);
  const shownTitle = isLookup ? lookupTitle(view, title) : title;
  const isCompact = variant === 'compact';
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <StatusDot tone={viewTone(view)} />
        <span
          className="text-sm font-semibold text-primary"
          role="status"
          aria-live="polite"
        >
          {shownTitle}
        </span>
        {!isCompact &&
          view.phase === 'answered' &&
          view.result.kind === 'response' && (
            <span className="text-2xs text-subtle tabular-nums">
              {formatMilliseconds(Math.round(view.result.durationMs))}
            </span>
          )}
        {invocationId && (
          <div className="ml-auto flex min-w-0">
            <InvocationIdLink invocationId={invocationId} />
          </div>
        )}
      </div>
      {message && (
        <p className="line-clamp-4 font-mono text-xs break-words text-danger-strong">
          {message}
        </p>
      )}
      {view.phase === 'accepted' && (
        <p className="text-xs text-muted">
          It runs in the background. Open it to follow its progress.
        </p>
      )}
      {view.phase === 'invocation' &&
        (isCompact ? (
          !view.isDone &&
          !message && (
            <p className="text-xs text-muted">
              {view.note ??
                'Restate is running it. You can close this; it keeps going.'}
            </p>
          )
        ) : (
          <Steps
            invocationId={view.invocationId}
            isDone={view.isDone}
            isLive={view.isLive}
            note={view.note}
          />
        ))}
      {value &&
        (isCompact ? (
          <ValueBlock result={value} className="max-h-48" />
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-2xs font-medium text-muted uppercase">
              Result
            </span>
            <ValueBlock result={value} />
          </div>
        ))}
    </>
  );
  const checkAgain = view.phase === 'invocation' ? view.checkAgain : undefined;
  const footer = (actions || invocationId || checkAgain) && (
    <div className={styles.footer()}>
      {actions}
      <div className={styles.trailing()}>
        {checkAgain && (
          <Button
            variant="secondary"
            className="rounded-lg px-3 py-1.5 text-sm"
            onClick={checkAgain}
          >
            Check again
          </Button>
        )}
        {invocationId && (
          <Hint
            stage="playground-result"
            placement={actions ? 'bottom end' : 'bottom start'}
            content={RESULT_HINT}
          >
            <OpenInvocation
              invocationId={invocationId}
              variant={
                view.phase === 'invocation' ||
                view.phase === 'accepted' ||
                isCompact
                  ? 'button'
                  : 'secondary-button'
              }
              isPulsing={view.phase === 'invocation' && view.isDone}
            />
          </Hint>
        )}
      </div>
    </div>
  );
  return (
    <section ref={ref} aria-label="Result" className={styles.root()}>
      {isCompact ? (
        <>
          <div className={styles.box()}>{content}</div>
          {footer}
        </>
      ) : (
        <div className={styles.box()}>
          {content}
          {footer}
        </div>
      )}
    </section>
  );
}
