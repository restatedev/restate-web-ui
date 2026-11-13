import type { ReactNode } from 'react';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { useRestateContext } from '@restate/features-restate-context';
import { formatJson } from '@restate/util-openapi';
import { tv } from '@restate/util-styles';
import {
  useInvocationTracking,
  type InvocationState,
} from '../InvocationPanel';
import type { PlaygroundResult } from '../ResponseView';
import { NOT_READY_STATUS } from '../status';
import type { RunRecord } from './useRunner';
import type { HandlerRun } from './useHandlerRun';

export type RunView =
  | { phase: 'sending' }
  | { phase: 'unreachable'; message: string }
  | { phase: 'rejected'; message: string; result: PlaygroundResult }
  | {
      phase: 'invocation';
      invocationId: string;
      state?: InvocationState;
      isDone: boolean;
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

export function useRunView(
  run: RunRecord | undefined,
  runner: HandlerRun['runner'],
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
  if (sentId) {
    const phase = tracking.tracking.phase;
    return {
      phase: 'invocation',
      invocationId: sentId,
      state: tracking.state,
      isDone: phase === 'completed',
      isFailed: tracking.state === 'failed',
      output: phase === 'completed' ? tracking.tracking.output : undefined,
      failure: tracking.failure ?? undefined,
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
  if (result.status >= 400 && !result.invocationId) {
    return {
      phase: 'rejected',
      result,
      message:
        errorMessage(result.text) ?? `Restate answered ${result.status}.`,
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

export const STATE_LABEL: Record<InvocationState, string> = {
  succeeded: 'Succeeded',
  failed: 'Failed',
  running: 'Running',
  retrying: 'Retrying',
  paused: 'Paused',
  scheduled: 'Scheduled',
  ready: 'Waiting to start',
};

export type Tone = 'neutral' | 'running' | 'success' | 'danger' | 'warning';

export function viewTone(view: RunView): Tone {
  switch (view.phase) {
    case 'sending':
      return 'running';
    case 'unreachable':
    case 'rejected':
      return 'danger';
    case 'answered':
      return view.isFailed ? 'danger' : 'success';
    case 'invocation':
      if (view.state === 'succeeded') return 'success';
      if (view.state === 'failed') return 'danger';
      if (view.state === 'retrying' || view.state === 'paused')
        return 'warning';
      return 'running';
  }
}

export function viewTitle(view: RunView) {
  switch (view.phase) {
    case 'sending':
      return 'Sending…';
    case 'unreachable':
      return 'Couldn’t reach Restate';
    case 'rejected':
      return 'Not accepted';
    case 'answered':
      return view.isFailed ? 'Failed' : 'Succeeded';
    case 'invocation':
      return view.state ? STATE_LABEL[view.state] : 'Starting…';
  }
}

export function viewValue(view: RunView) {
  if (view.phase === 'answered') {
    return view.result;
  }
  if (view.phase === 'invocation') {
    return view.output;
  }
  return undefined;
}

export function viewMessage(view: RunView) {
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

export function viewInvocationId(view?: RunView) {
  if (view?.phase === 'invocation') {
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

export function StatusDot({ tone }: { tone: Tone }) {
  return <span className={dotStyles({ tone })} />;
}

const valueStyles = tv({
  base: 'max-h-64 overflow-auto rounded-lg border border-inset bg-inset px-2.5 py-2 font-mono text-xs break-all whitespace-pre-wrap text-secondary',
});

export function ValueBlock({
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

export function invocationHref(baseUrl: string, invocationId: string) {
  return `${baseUrl}/invocations/${invocationId}`;
}

const openStyles = tv({
  base: 'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm',
  variants: {
    isPulsing: { true: 'animate-pulseButton', false: '' },
  },
});

export function OpenInvocation({
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

export function InvocationIdLink({ invocationId }: { invocationId: string }) {
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
