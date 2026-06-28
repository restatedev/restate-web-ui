import type { PropsWithChildren, ReactNode } from 'react';
import type { InvocationVqueue } from '@restate/data-access/admin-api-spec';
import { Badge } from '@restate/ui/badge';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { Ellipsis } from '@restate/ui/loading';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { DateTooltip } from '@restate/ui/tooltip';
import { formatDurations } from '@restate/util/intl';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { tv } from '@restate/util/styles';
import { durationToSeconds, formatVqueueDuration } from './duration';
import { LimitDetail } from './LimitDetail';
import { gateLabel, gateTone } from './palette';

// The scheduler's verdict for the queue head — the queue-level counterpart to an
// invocation's Status. Mirrors Status.tsx: a dashed status pill, an optional
// secondary chip that opens a popover with the detail (here: the blocking
// resource), and a muted "for / in <time>" trailing the pill.
type SchedulingStatus = NonNullable<
  NonNullable<InvocationVqueue['status']>['scheduling']
>;

const STATUS_LABEL: Record<SchedulingStatus, string> = {
  dormant: 'Dormant',
  empty: 'Empty',
  ready: 'Ready',
  scheduled: 'Scheduled',
  blocked: 'Blocked',
};

const STATUS_VARIANT: Record<SchedulingStatus, 'default' | 'info' | 'warning'> =
  {
    dormant: 'default',
    empty: 'default',
    ready: 'info',
    scheduled: 'default',
    blocked: 'warning',
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

const LEVEL_LABEL: Record<string, string> = {
  scope: 'scope',
  level1: 'level 1',
  level2: 'level 2',
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
    },
    mini: { true: '', false: '', md: 'max-md:pr-2' },
  },
});

// Secondary detail (resource chip / time) — collapses below `md` when mini="md",
// for tight layouts; the default keeps it always visible.
const secondaryStyles = tv({
  base: '',
  variants: {
    mini: { true: 'hidden', false: 'contents', md: 'hidden md:contents' },
  },
  defaultVariants: { mini: false },
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
  // Older servers don't carry the scheduler verdict; derive a sensible default.
  if (data.status?.blocked) {
    return 'blocked';
  }
  const counts = data.counts ?? {};
  const total =
    (counts.inbox ?? 0) +
    (counts.running ?? 0) +
    (counts.suspended ?? 0) +
    (counts.paused ?? 0);
  return total === 0 ? 'empty' : 'dormant';
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
  mini = false,
}: {
  data: InvocationVqueue;
  className?: string;
  mini?: boolean | 'md';
}) {
  const status = resolveStatus(data);
  const variant = STATUS_VARIANT[status];

  return (
    <div className="flex flex-row flex-wrap items-baseline gap-0.5">
      <Badge variant={variant} className={styles({ className, status, mini })}>
        <Ellipsis visible={status === 'ready'}>{STATUS_LABEL[status]}</Ellipsis>
        <span className={secondaryStyles({ mini })}>
          {status === 'blocked' && <BlockedDetail data={data} />}
        </span>
      </Badge>
      <span className={secondaryStyles({ mini })}>
        <StatusTime data={data} status={status} />
      </span>
    </div>
  );
}

// The blocking resource, as a chip that opens a popover with the full reason —
// the queue-side analogue of Status.tsx's "after…" error chip.
function BlockedDetail({ data }: { data: InvocationVqueue }) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const { resource, chip, title, lead, isRuleBlock } = describeBlocked(data);
  const forLabel = blockedForLabel(data);
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
        <Button
          variant="secondary"
          className="flex h-5 items-center gap-1 truncate rounded-md border-gray-200/80 bg-white/70 px-1.5 py-0.5 text-2xs text-orange-700 shadow-none"
        >
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
        <DropdownSection title={`Blocked on ${title}`}>
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

            {resource?.resource === 'limit-key-concurrency' && (
              <DetailBox>
                <DetailRow label="rule">
                  <Mono>{resource.blockedRule ?? 'removed'}</Mono>
                </DetailRow>
                {resource.limitKey && (
                  <DetailRow label="key">
                    <Mono>{resource.limitKey}</Mono>
                  </DetailRow>
                )}
                {resource.blockedLevel && (
                  <DetailRow label="level">
                    {LEVEL_LABEL[resource.blockedLevel] ??
                      resource.blockedLevel}
                  </DetailRow>
                )}
              </DetailBox>
            )}

            {isRuleBlock && <LimitDetail />}
          </div>
        </DropdownSection>
      </PopoverContent>
    </Popover>
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
    const resource = data.status?.blockedResource;
    if (
      resource?.resource === 'invoker-throttling' &&
      resource.estimatedRetryAt
    ) {
      const badge = fromDate(
        resource.estimatedRetryAt,
        'retries in',
        'Invoker retries at',
      );
      if (badge) {
        return badge;
      }
    }
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

// How long the head has been blocked: the wait on the gate it's blocked on, or
// the longest live gate wait when the gate isn't named.
function blockedForLabel(data: InvocationVqueue): string | undefined {
  const blockedOn = data.status?.blockedOn;
  const nowBlocks = data.head?.nowBlocks ?? [];
  const dominant = blockedOn
    ? nowBlocks.find((block) => block.gate === blockedOn)
    : [...nowBlocks].sort(
        (a, b) => durationToSeconds(b.duration) - durationToSeconds(a.duration),
      )[0];
  const label = dominant ? formatVqueueDuration(dominant.duration) : '';
  return label || undefined;
}
