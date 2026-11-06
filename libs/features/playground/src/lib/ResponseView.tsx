import { useState, type ReactNode } from 'react';
import { Badge } from '@restate/ui-badge';
import { Button } from '@restate/ui-button';
import { Copy } from '@restate/ui-copy';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { Spinner } from '@restate/ui-loading';
import { useRestateContext } from '@restate/features-restate-context';
import { bytesToBase64 } from '@restate/util-binary';
import { formatCompactDateTime } from '@restate/util-intl';
import { tv } from '@restate/util-styles';
import { InfoButton } from './InfoButton';
import { SegmentedControl } from './SegmentedControl';
import { NOT_READY_STATUS, statusText } from './status';

export type PlaygroundResult =
  | {
      kind: 'response';
      status: number;
      statusText: string;
      durationMs: number;
      headers: [string, string][];
      contentType?: string;
      text?: string;
      bytes: Uint8Array;
      invocationId?: string;
      executionTime?: string;
    }
  | {
      kind: 'error';
      message: string;
      url: string;
      durationMs: number;
    };

export type FollowUpKind = 'attach' | 'output';

export interface FollowUp {
  kind: FollowUpKind;
  isPending: boolean;
  result?: PlaygroundResult;
}

const TEXT_DECODER = new TextDecoder('utf-8', { fatal: true });

function hasControlCharacters(text: string) {
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code < 9 || (code > 13 && code < 32)) {
      return true;
    }
  }
  return false;
}

function decodeText(bytes: Uint8Array, contentType?: string) {
  if (bytes.length === 0) {
    return '';
  }
  const isTextual =
    !contentType || /json|text|xml|javascript|yaml|csv|html/i.test(contentType);
  try {
    const text = TEXT_DECODER.decode(bytes);
    return isTextual || !hasControlCharacters(text) ? text : undefined;
  } catch {
    return undefined;
  }
}

function acceptedFields(text?: string) {
  if (!text) {
    return {};
  }
  try {
    const parsed = JSON.parse(text) as {
      invocationId?: unknown;
      executionTime?: unknown;
    };
    return {
      invocationId:
        typeof parsed?.invocationId === 'string'
          ? parsed.invocationId
          : undefined,
      executionTime:
        typeof parsed?.executionTime === 'string'
          ? parsed.executionTime
          : undefined,
    };
  } catch {
    return {};
  }
}

export async function toPlaygroundResult(
  response: Response,
  durationMs: number,
): Promise<PlaygroundResult> {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') ?? undefined;
  const text = decodeText(bytes, contentType);
  const fields = acceptedFields(text);
  return {
    kind: 'response',
    status: response.status,
    statusText: statusText(response.status, response.statusText),
    durationMs,
    headers: Array.from(response.headers.entries()),
    contentType,
    text,
    bytes,
    invocationId: response.headers.get('x-restate-id') ?? fields.invocationId,
    executionTime: fields.executionTime,
  };
}

function prettyJson(text: string) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return undefined;
  }
}

function restateError(text?: string) {
  if (!text) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return typeof parsed['message'] === 'string'
      ? {
          message: parsed['message'],
          source:
            typeof parsed['source'] === 'string' ? parsed['source'] : undefined,
          code: typeof parsed['code'] === 'number' ? parsed['code'] : undefined,
        }
      : undefined;
  } catch {
    return undefined;
  }
}

function statusVariant(status: number) {
  if (status === NOT_READY_STATUS) return 'default';
  if (status >= 500) return 'danger';
  if (status >= 400) return 'warning';
  if (status >= 200 && status < 300) return 'success';
  return 'default';
}

const bodyStyles = tv({
  base: 'max-h-96 overflow-auto rounded-lg border border-inset bg-inset p-2 font-mono text-xs break-all whitespace-pre-wrap text-secondary shadow-[inset_0_1px_2px_0px_var(--box-shadow-color-inset)]',
});

export function OpenInvocationLink({ invocationId }: { invocationId: string }) {
  const { baseUrl } = useRestateContext();
  return (
    <Link
      variant="secondary-button"
      href={`${baseUrl}/invocations/${invocationId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 px-2.5 py-1 text-xs"
    >
      Open invocation
      <Icon name={IconName.ExternalLink} className="h-3 w-3" />
    </Link>
  );
}

export function ResponseView({
  result,
  children,
}: {
  result: PlaygroundResult;
  children?: ReactNode;
}) {
  const [view, setView] = useState<'pretty' | 'raw' | 'headers'>('pretty');

  if (result.kind === 'error') {
    return (
      <div
        role="alert"
        className="flex flex-col gap-1 rounded-xl border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger-strong"
      >
        <div className="flex items-center gap-1.5 font-medium">
          <Icon name={IconName.CircleX} className="h-4 w-4" />
          Couldn’t reach the ingress
        </div>
        <div className="text-xs">{result.message}</div>
        <div className="text-xs">
          Check that Restate is running and that{' '}
          <code className="font-mono">{new URL(result.url).origin}</code> is
          reachable from this browser.
        </div>
      </div>
    );
  }

  const isNotReady = result.status === NOT_READY_STATUS;
  const pretty =
    result.text !== undefined ? prettyJson(result.text) : undefined;
  const error =
    result.status >= 400 && !isNotReady ? restateError(result.text) : undefined;
  const bodyText =
    result.text === undefined
      ? bytesToBase64(result.bytes)
      : view === 'pretty' && pretty
        ? pretty
        : result.text;
  const copyText =
    view === 'headers'
      ? result.headers.map(([name, value]) => `${name}: ${value}`).join('\n')
      : bodyText;
  const showBody = view === 'raw' || !isNotReady;

  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant(result.status)} size="sm">
          <span className="font-mono">{result.status}</span>
          {result.statusText && (
            <span className="ml-1">{result.statusText}</span>
          )}
        </Badge>
        <span className="text-xs text-muted">
          {Math.round(result.durationMs)} ms
        </span>
        <div className="ml-auto flex items-center gap-1">
          <SegmentedControl
            label="Response view"
            value={view}
            onChange={setView}
            options={[
              { value: 'pretty', label: 'Body' },
              { value: 'raw', label: 'Raw' },
              { value: 'headers', label: 'Headers' },
            ]}
          />
          {copyText && <Copy copyText={copyText} className="p-1.5" />}
        </div>
      </div>
      {isNotReady && view === 'pretty' && (
        <div className="rounded-lg border bg-surface px-3 py-2 text-xs text-secondary">
          <div className="font-medium text-primary">Not finished yet</div>
          The invocation hasn’t completed, so there is no result yet.
        </div>
      )}
      {error && view === 'pretty' && (
        <div className="rounded-lg border border-danger/40 bg-danger-subtle px-3 py-2 text-xs text-danger-strong">
          <div className="font-medium">
            {error.source === 'ingress'
              ? 'Restate rejected the request'
              : error.source === 'invocation'
                ? 'The handler failed with a terminal error'
                : 'Request failed'}
            {error.code !== undefined && ` (${error.code})`}
          </div>
          <div className="mt-0.5 break-words">{error.message}</div>
        </div>
      )}
      {view === 'headers' ? (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-lg border border-inset bg-inset p-2 font-mono text-xs">
          {result.headers.map(([name, value]) => (
            <div key={name} className="contents">
              <dt className="text-muted">{name}</dt>
              <dd className="break-all text-secondary">{value}</dd>
            </div>
          ))}
        </dl>
      ) : !showBody ? null : result.bytes.length === 0 ? (
        <div className="text-xs text-muted">Empty body</div>
      ) : (
        <>
          <pre className={bodyStyles()}>{bodyText}</pre>
          {result.text === undefined && (
            <div className="text-2xs text-muted">
              Binary body ({result.bytes.length} bytes), shown as Base64.
            </div>
          )}
        </>
      )}
      {children}
    </div>
  );
}

export function InvocationPanel({
  invocationId,
  executionTime,
  canAttach,
  canGetOutput,
  followUp,
  onRun,
  onCancel,
}: {
  invocationId: string;
  executionTime?: string;
  canAttach: boolean;
  canGetOutput: boolean;
  followUp?: FollowUp;
  onRun: (kind: FollowUpKind) => void;
  onCancel: () => void;
}) {
  const scheduledAt = executionTime ? new Date(executionTime) : undefined;
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border bg-surface p-3">
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-auto text-xs text-secondary">
          The invocation runs in the background
          {scheduledAt && !isNaN(scheduledAt.valueOf())
            ? ` and is scheduled for ${formatCompactDateTime(scheduledAt)}.`
            : '.'}
        </p>
        <div className="shrink-0">
          <OpenInvocationLink invocationId={invocationId} />
        </div>
      </div>
      {(canAttach || canGetOutput) && (
        <div className="flex flex-wrap items-center gap-2">
          {canAttach && (
            <Button
              variant="secondary"
              className="px-2.5 py-1 text-xs"
              disabled={followUp?.isPending}
              onClick={() => onRun('attach')}
            >
              Wait for result
            </Button>
          )}
          {canGetOutput && (
            <Button
              variant="secondary"
              className="px-2.5 py-1 text-xs"
              disabled={followUp?.isPending}
              onClick={() => onRun('output')}
            >
              Check result
            </Button>
          )}
          <InfoButton label="Wait or check?">
            <p className="text-muted">
              <span className="font-medium text-secondary">
                Wait for result
              </span>{' '}
              keeps the request open until the invocation finishes, then shows
              its result. A delayed invocation waits for its delay first.
            </p>
            <p className="text-muted">
              <span className="font-medium text-secondary">Check result</span>{' '}
              answers right away: the result if the invocation is done,
              otherwise “not finished yet”.
            </p>
          </InfoButton>
        </div>
      )}
      {followUp?.isPending && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <Spinner className="h-3.5 w-3.5" />
          {followUp.kind === 'attach'
            ? 'Waiting for the invocation to finish…'
            : 'Checking…'}
          <Button
            variant="secondary"
            className="ml-auto px-2.5 py-1 text-xs"
            onClick={onCancel}
          >
            Stop waiting
          </Button>
        </div>
      )}
      {followUp?.result && !followUp.isPending && (
        <ResponseView result={followUp.result} />
      )}
    </div>
  );
}
