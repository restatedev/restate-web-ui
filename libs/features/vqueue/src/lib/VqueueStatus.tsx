import type { PropsWithChildren, ReactNode } from 'react';
import type { InvocationVqueue } from '@restate/data-access/admin-api-spec';
import { Badge } from '@restate/ui/badge';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { Ellipsis } from '@restate/ui/loading';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { DateTooltip } from '@restate/ui/tooltip';
import { formatDurations, formatNumber } from '@restate/util/intl';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { tv } from '@restate/util/styles';
import { PatternChip } from '@restate/features/limits-ui';
import { useRestateContext } from '@restate/features/restate-context';
import { durationToSeconds, formatVqueueDuration } from './duration';
import { gateLabel, gateTone } from './palette';

// The scheduler's verdict for the queue head — the queue-level counterpart to an
// invocation's Status. Mirrors Status.tsx: a dashed status pill, an optional
// secondary chip that opens a popover with the detail (here: the blocking
// resource), and a muted "for / in <time>" trailing the pill.
type SchedulingStatus =
  | NonNullable<NonNullable<InvocationVqueue['status']>['scheduling']>
  | 'running'
  | 'paused'
  | 'idle';

const STATUS_LABEL: Record<SchedulingStatus, string> = {
  dormant: 'Dormant',
  empty: 'Empty',
  ready: 'Ready',
  scheduled: 'Scheduled',
  blocked: 'Blocked',
  running: 'Running',
  paused: 'Paused',
  idle: 'Idle',
};

const STATUS_VARIANT: Record<SchedulingStatus, 'default' | 'info' | 'warning'> =
  {
    dormant: 'default',
    empty: 'default',
    ready: 'info',
    scheduled: 'default',
    blocked: 'warning',
    running: 'info',
    paused: 'warning',
    idle: 'default',
  };

// User-facing copy per blocked reason, keyed by the canonical BlockedResource
// `resource` (scheduler_status.rs). `title` reads as a noun phrase so it works
// both in the chip ("Blocked … on <title>") and the dropdown header ("Blocked on
// <title>"); `lead` is the dropdown's one-line explanation.
const BLOCKED_COPY: Record<string, { title: string; lead: string }> = {
  lock: {
    title: 'object lock',
    lead: 'Waiting for the virtual-object lock — another invocation is holding it.',
  },
  'invoker-concurrency': {
    title: 'invoker capacity',
    lead: 'The invoker is at its concurrency limit — too many attempts are already running on this node.',
  },
  'invoker-throttling': {
    title: 'invoker throttling',
    lead: 'The invoker is throttling new attempts after recent failures.',
  },
  'invoker-memory': {
    title: 'invoker memory',
    lead: 'The invoker has no memory headroom to start another attempt.',
  },
  'deployment-concurrency': {
    title: 'deployment capacity',
    lead: 'The target deployment is at its maximum concurrent invocations.',
  },
  'limit-key-concurrency': {
    title: 'concurrency rule',
    lead: 'A concurrency rule has reached its configured limit.',
  },
  'throttling-rules': {
    title: 'throttling rule',
    lead: 'A throttling rule has reached its configured rate limit.',
  },
};

// Older servers populate only the gate string (blocked_on). Map it to the same
// canonical key so the fallback path reads identically to the parsed path.
const GATE_TO_KEY: Record<string, string> = {
  lock: 'lock',
  invoker_concurrency: 'invoker-concurrency',
  invoker_throttling: 'invoker-throttling',
  invoker_memory: 'invoker-memory',
  deployment_concurrency: 'deployment-concurrency',
  concurrency_rules: 'limit-key-concurrency',
  throttling_rules: 'throttling-rules',
};

// Canonical key → scheduling gate, so the chip/popover pick up the gate's colour.
const RESOURCE_GATE: Record<string, string> = {
  lock: 'lock',
  'invoker-concurrency': 'invoker_concurrency',
  'invoker-throttling': 'invoker_throttling',
  'invoker-memory': 'invoker_memory',
  'deployment-concurrency': 'deployment_concurrency',
  'limit-key-concurrency': 'concurrency_rules',
  'throttling-rules': 'throttling_rules',
};

const styles = tv({
  base: 'relative inline-flex max-w-full items-center gap-2',
  variants: {
    status: {
      // Has entries but nothing the scheduler cares about — quiet, like a
      // "ready" invocation pill.
      dormant: 'border-dashed border-zinc-300 bg-transparent text-zinc-500',
      // Literally nothing queued — the faintest, solid (not in-flight).
      empty: 'border-zinc-200/80 bg-zinc-50 text-zinc-400',
      // Head runnable now / making progress.
      ready: 'border-dashed',
      // Head waiting for a future run_at.
      scheduled: 'border-dashed border-zinc-400/60 bg-transparent',
      // Head can't run — seats the resource chip on the right.
      blocked: 'border-dashed py-0.5 pr-0.5',
      running: 'border-dashed py-0.5 pr-0.5',
      paused: 'border-dashed',
      idle: 'border-dashed border-zinc-300 bg-transparent text-zinc-500',
    },
  },
});

const miniLabel = tv({
  base: 'text-2xs font-medium',
  variants: {
    status: {
      dormant: 'text-gray-500',
      empty: 'text-gray-400',
      ready: 'text-blue-700',
      scheduled: 'text-gray-600',
      blocked: 'text-orange-700',
      running: 'text-blue-700',
      paused: 'text-amber-700',
      idle: 'text-gray-500',
    },
  },
});
const blockedChip = tv({
  base: 'flex h-5 items-center gap-1 truncate rounded-md border-gray-200/80 bg-white/70 px-1.5 py-0.5 text-2xs text-orange-700 shadow-none',
});

const timeStyles = tv({
  base: 'max-w-full truncate border-none bg-transparent py-0 text-2xs font-normal text-zinc-500/80',
});

function resolveStatus(data: InvocationVqueue): SchedulingStatus {
  const raw = data.status?.scheduling;
  if (
    raw === 'dormant' ||
    raw === 'empty' ||
    raw === 'ready' ||
    raw === 'scheduled' ||
    raw === 'blocked'
  ) {
    return raw;
  }
  // No scheduler row — derive. Paused is checked before running because a paused
  // queue also has no scheduler row yet can still have in-flight invocations.
  if (data.identity?.isPaused) {
    return 'paused';
  }
  if ((data.counts?.running ?? 0) > 0) {
    return 'running';
  }
  return 'idle';
}

// Canonical blocked key from the parsed resource, or the gate string — which may
// already be in resource vocab ("limit-key-concurrency") or gate vocab
// ("concurrency_rules"). Both resolve to one key so every surface reads the same.
function canonicalKey(
  resource?: string,
  blockedOn?: string,
): string | undefined {
  if (resource) {
    return resource;
  }
  if (!blockedOn) {
    return undefined;
  }
  if (BLOCKED_COPY[blockedOn]) {
    return blockedOn;
  }
  return GATE_TO_KEY[blockedOn] ?? blockedOn;
}

// The friendly title for a blocked reason, from the gate string alone (used by
// surfaces that only have the gate, e.g. the queue head). Matches the chip.
export function blockedTitle(gate?: string): string {
  const key = canonicalKey(undefined, gate);
  return (key && BLOCKED_COPY[key]?.title) || gateLabel(gate);
}

// What to call the thing the head is blocked on, as a noun phrase. The chip and
// the dropdown both read "… on <title>".
function describeBlocked(data: InvocationVqueue) {
  const resource = data.status?.blockedResource;
  const blockedOn = data.status?.blockedOn;
  const key = canonicalKey(resource?.resource, blockedOn);
  const copy = key ? BLOCKED_COPY[key] : undefined;
  const title = copy?.title ?? gateLabel(blockedOn);
  const gateForTone = (key && RESOURCE_GATE[key]) || blockedOn || undefined;
  return {
    resource,
    chip: `on ${title}`,
    title,
    lead:
      copy?.lead ??
      `The head of this queue can’t be dispatched — it’s waiting on ${title}.`,
    tone: gateTone(gateForTone),
    isRuleBlock: key === 'limit-key-concurrency' || key === 'throttling-rules',
  };
}

export function VqueueStatus({
  data,
  className,
  variant = 'default',
}: {
  data: InvocationVqueue;
  className?: string;
  variant?: 'default' | 'mini';
}) {
  const status = resolveStatus(data);

  if (status === 'idle') {
    return null;
  }

  const showNextItem =
    variant === 'default' && (status === 'blocked' || status === 'scheduled');
  const innerChip =
    status === 'blocked' ? (
      <BlockedDetail
        data={data}
        className={variant === 'mini' ? 'shadow-xs' : undefined}
      />
    ) : status === 'running' ? (
      <RunningCount data={data} />
    ) : null;

  return (
    <div
      className={
        variant === 'mini'
          ? 'flex flex-row flex-wrap items-center gap-1 pl-1'
          : 'flex flex-row flex-wrap items-baseline gap-1'
      }
    >
      {showNextItem && (
        <span className="text-2xs text-gray-500">Next item</span>
      )}
      {variant === 'mini' ? (
        <>
          <span className={miniLabel({ status })}>{STATUS_LABEL[status]}</span>
          {innerChip}
        </>
      ) : (
        <Badge
          variant={STATUS_VARIANT[status]}
          className={styles({ className, status })}
        >
          <Ellipsis visible={status === 'ready'}>
            {STATUS_LABEL[status]}
          </Ellipsis>
          {innerChip}
        </Badge>
      )}
      <StatusTime data={data} status={status} />
    </div>
  );
}

function RunningCount({ data }: { data: InvocationVqueue }) {
  const n = data.counts?.running ?? 0;
  if (n <= 0) {
    return null;
  }
  return (
    <span className="flex h-5 items-center rounded-md border border-gray-200/80 bg-white/70 px-1.5 py-0.5 text-2xs font-medium text-blue-700">
      {formatNumber(n)} {n === 1 ? 'item' : 'items'}
    </span>
  );
}

function ruleMatchHref(
  baseUrl: string,
  rule: string,
  matchKey: string,
): string {
  const base = `${baseUrl}/limits/rules/${encodeURIComponent(rule)}`;
  if (!matchKey) {
    return base;
  }
  const m = encodeURIComponent(matchKey);
  return `${base}?match=${m}&tab=${m}`;
}

// The blocking resource, as a chip that opens a popover with the full reason —
// the queue-side analogue of Status.tsx's "after…" error chip.
function BlockedDetail({
  data,
  className,
}: {
  data: InvocationVqueue;
  className?: string;
}) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const { baseUrl } = useRestateContext();
  const { resource, chip, title, lead } = describeBlocked(data);
  const forLabel = blockedForLabel(data);
  const rulePattern = resource?.blockedRule;
  const ruleScope = resource?.scope ?? rulePattern?.split('/')[0];
  const limitKey = resource?.limitKey;
  const matchKey =
    resource?.blockedLevel === 'scope'
      ? (ruleScope ?? '')
      : resource?.blockedLevel === 'level1'
        ? [ruleScope, limitKey?.split('/')[0]].filter(Boolean).join('/')
        : [ruleScope, limitKey].filter(Boolean).join('/');
  const matchHref = rulePattern
    ? ruleMatchHref(baseUrl, rulePattern, matchKey)
    : undefined;
  const ruleHref = rulePattern
    ? `${baseUrl}/limits/rules/${encodeURIComponent(rulePattern)}`
    : undefined;
  const retryAt =
    resource?.resource === 'invoker-throttling'
      ? resource.estimatedRetryAt
      : undefined;
  const retryLabel = retryAt
    ? formatDurations(durationSinceLastSnapshot(retryAt))
    : '';

  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="secondary" className={blockedChip({ className })}>
          <Icon
            name={IconName.TriangleAlert}
            className="h-3 w-3 shrink-0 text-orange-600"
          />
          <span className="truncate">{chip}</span>
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-3 w-3 shrink-0 text-gray-500"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <DropdownSection
          title={
            resource?.resource === 'limit-key-concurrency'
              ? 'Blocked — concurrency limit full'
              : `Blocked on ${title}`
          }
        >
          {resource?.resource === 'limit-key-concurrency' && rulePattern ? (
            <div className="flex w-[20rem] max-w-[80vw] flex-col p-1.5">
              {matchHref && (
                <LimitLinkRow
                  label="counter"
                  pattern={matchKey || rulePattern}
                  href={matchHref}
                  subtitle="usage & the queues sharing it"
                />
              )}
              {matchHref && ruleHref && (
                <div className="mx-2 my-1 h-px bg-gray-200/70" />
              )}
              {ruleHref && (
                <LimitLinkRow
                  label="rule"
                  pattern={rulePattern}
                  href={ruleHref}
                  subtitle="view or change the limit"
                  isRule
                />
              )}
            </div>
          ) : (
            <div className="flex w-[20rem] max-w-[80vw] flex-col gap-2 p-2.5">
              <p className="text-2xs text-gray-500">
                {lead}
                {forLabel && (
                  <>
                    {' '}
                    Blocked for{' '}
                    <span className="font-medium text-zinc-700 tabular-nums">
                      {forLabel}
                    </span>
                    .
                  </>
                )}
              </p>

              {resource?.resource === 'lock' &&
                (resource.lockName || resource.scope) && (
                  <DetailBox>
                    {resource.lockName && (
                      <DetailRow label="lock">
                        <Mono>{resource.lockName}</Mono>
                      </DetailRow>
                    )}
                    {resource.scope && (
                      <DetailRow label="scope">
                        <Mono>{resource.scope}</Mono>
                      </DetailRow>
                    )}
                  </DetailBox>
                )}

              {resource?.resource === 'invoker-throttling' &&
                retryAt &&
                retryLabel && (
                  <DetailBox>
                    <DetailRow label="retries">
                      <DateTooltip
                        date={new Date(retryAt)}
                        title="Invoker retries at"
                      >
                        <span className="tabular-nums">in {retryLabel}</span>
                      </DateTooltip>
                    </DetailRow>
                  </DetailBox>
                )}
            </div>
          )}
        </DropdownSection>
      </PopoverContent>
    </Popover>
  );
}

function LimitLinkRow({
  label,
  pattern,
  href,
  subtitle,
  isRule,
}: {
  label: string;
  pattern: string;
  href: string;
  subtitle: string;
  isRule?: boolean;
}) {
  return (
    <Link
      href={href}
      variant="secondary"
      className="flex items-center gap-2.5 rounded-lg p-2 no-underline transition-colors hover:bg-black/4"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="w-12 shrink-0 text-3xs font-bold tracking-wide text-gray-400 uppercase">
            {label}
          </span>
          <PatternChip pattern={pattern} isRule={isRule} className="min-w-0" />
        </div>
        <span className="pl-14 text-2xs text-gray-400">{subtitle}</span>
      </div>
      <Icon
        name={IconName.ChevronRight}
        className="h-4 w-4 shrink-0 text-gray-400"
      />
    </Link>
  );
}

// Muted trailing time, styled like Status.tsx's Duration badge: "retries in
// <time>" when the invoker is throttling, "for <wait>" when otherwise blocked,
// "in <when>" when scheduled; nothing otherwise.
function StatusTime({
  data,
  status,
}: {
  data: InvocationVqueue;
  status: SchedulingStatus;
}) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();

  const fromDate = (date: string, prefix: string, title: string) => {
    const label = formatDurations(durationSinceLastSnapshot(date));
    if (!label) {
      return null;
    }
    return (
      <Badge size="sm" className={timeStyles()}>
        <span className="truncate">
          {prefix}{' '}
          <DateTooltip date={new Date(date)} title={title}>
            <span className="font-medium text-zinc-500/90 tabular-nums">
              {label}
            </span>
          </DateTooltip>
        </span>
      </Badge>
    );
  };

  if (status === 'blocked') {
    const forLabel = blockedForLabel(data);
    if (!forLabel) {
      return null;
    }
    return (
      <Badge size="sm" className={timeStyles()}>
        <span className="truncate">
          for{' '}
          <span className="font-medium text-zinc-500/90 tabular-nums">
            {forLabel}
          </span>
        </span>
      </Badge>
    );
  }

  if (status === 'scheduled' && data.status?.scheduledAt) {
    return fromDate(data.status.scheduledAt, 'in', 'Runs at');
  }

  return null;
}

function DetailBox({ children }: PropsWithChildren) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-black/5 bg-white/70 px-2.5 py-2">
      {children}
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-2xs">
      <span className="shrink-0 text-gray-400">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-zinc-700">
        {children}
      </span>
    </div>
  );
}

function Mono({ children }: PropsWithChildren) {
  return <span className="font-mono">{children}</span>;
}

// How long the head has been blocked: the sum of all live gate waits.
function blockedForLabel(data: InvocationVqueue): string | undefined {
  const sumSeconds = (data.head?.nowBlocks ?? []).reduce(
    (acc, block) => acc + durationToSeconds(block.duration),
    0,
  );
  if (sumSeconds <= 0) {
    return undefined;
  }
  return formatVqueueDuration(sumSeconds * 1000) || undefined;
}
