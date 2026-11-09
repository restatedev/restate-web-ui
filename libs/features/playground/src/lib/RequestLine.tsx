import { Fragment } from 'react';
import { Button } from '@restate/ui-button';
import { Copy } from '@restate/ui-copy';
import { Icon, IconName } from '@restate/ui-icons';
import { Spinner } from '@restate/ui-loading';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui-tooltip';
import { tv } from '@restate/util-styles';

const methodStyles = tv({
  base: 'shrink-0 font-mono text-2xs font-semibold',
  variants: {
    method: {
      GET: '',
      POST: '',
      DELETE: '',
      other: '',
    },
    variant: {
      badge: 'rounded-md border px-1.5 py-0.5',
      text: 'w-8',
    },
  },
  compoundVariants: [
    {
      variant: 'badge',
      method: 'GET',
      className:
        'border-success-strong/20 bg-success-subtle text-success-strong',
    },
    {
      variant: 'badge',
      method: 'POST',
      className: 'border-info-strong/20 bg-info-subtle text-info-strong',
    },
    {
      variant: 'badge',
      method: 'DELETE',
      className: 'border-danger-strong/20 bg-danger-subtle text-danger-strong',
    },
    {
      variant: 'badge',
      method: 'other',
      className:
        'border-warning-strong/20 bg-warning-subtle text-warning-strong',
    },
    { variant: 'text', method: 'GET', className: 'text-success' },
    { variant: 'text', method: 'POST', className: 'text-info' },
    { variant: 'text', method: 'DELETE', className: 'text-danger' },
    { variant: 'text', method: 'other', className: 'text-warning' },
  ],
});

export function Method({
  method,
  variant = 'badge',
}: {
  method: string;
  variant?: 'badge' | 'text';
}) {
  return (
    <span
      className={methodStyles({
        variant,
        method:
          method === 'GET' || method === 'POST' || method === 'DELETE'
            ? method
            : 'other',
      })}
    >
      {method}
    </span>
  );
}

function UrlText({ text }: { text: string }) {
  const parts = text.split('/');
  return parts.map((part, index) => (
    <Fragment key={index}>
      {part}
      {index < parts.length - 1 && '/'}
      {index < parts.length - 1 && parts[index + 1] !== '' && <wbr />}
    </Fragment>
  ));
}

export function RequestLine({
  method,
  url,
  baseUrl,
  runLabel,
  isSending,
  onCancel,
}: {
  method: string;
  url: string;
  baseUrl: string;
  runLabel: string;
  isSending: boolean;
  onCancel: () => void;
}) {
  const base = baseUrl.replace(/\/+$/, '');
  const path = url.startsWith(base) ? url.slice(base.length) : url;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Method method={method} />
      <span className="min-w-0 flex-[1_1_16rem] font-mono text-0.5xs wrap-break-word select-all">
        {path !== url && (
          <span className="text-subtle">
            <UrlText text={base} />
          </span>
        )}
        <span className="text-primary">
          <UrlText text={path} />
        </span>
      </span>
      <Copy copyText={url} className="ml-auto shrink-0 p-1.5" />
      {isSending && (
        <Button
          variant="secondary"
          className="shrink-0 rounded-lg px-3 py-1.5"
          onClick={onCancel}
        >
          Cancel
        </Button>
      )}
      <Tooltip>
        <TooltipTrigger>
          <Button
            type="submit"
            variant="primary"
            disabled={isSending}
            aria-keyshortcuts="Meta+Enter Control+Enter"
            className="flex min-w-24 shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-1.5"
          >
            {isSending ? (
              <Spinner className="h-3.5 w-3.5" />
            ) : (
              <Icon name={IconName.Play} className="h-3.5 w-3.5 fill-current" />
            )}
            {runLabel}
          </Button>
        </TooltipTrigger>
        <TooltipContent size="sm">⌘ or Ctrl + Enter</TooltipContent>
      </Tooltip>
    </div>
  );
}
