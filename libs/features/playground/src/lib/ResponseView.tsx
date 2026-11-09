import { useState, type ReactNode } from 'react';
import { Badge } from '@restate/ui-badge';
import { Copy } from '@restate/ui-copy';
import { Icon, IconName } from '@restate/ui-icons';
import { bytesToBase64 } from '@restate/util-binary';
import { tv } from '@restate/util-styles';
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
