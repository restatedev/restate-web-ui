import type { ReactNode } from 'react';
import { Badge } from '@restate/ui/badge';
import { Ellipsis } from '@restate/ui/loading';
import { DateTooltip } from '@restate/ui/tooltip';
import { formatDurations } from '@restate/util/intl';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { tv } from '@restate/util/styles';

// A queue entry's status, styled like the invocation Status pill but derived
// from its (stage, status). Stage wins for running/suspended/paused/finished;
// the inbox and finished stages read their lifecycle from `status`.
export type EntryStatusData = {
  stage?: string;
  status?: string;
  kind?: string;
  transitionedAt?: string;
  nextAt?: string;
  createdAt?: string;
  sequenceNumber?: number;
  retryAttempts?: number;
  numAttempts?: number;
  numErrors?: number;
  numSuspensions?: number;
  numPauses?: number;
  numYields?: number;
  deployment?: string;
  hasLock?: boolean;
};

type UiStatus =
  | 'pending'
  | 'scheduled'
  | 'backing-off'
  | 'yielded'
  | 'running'
  | 'suspended'
  | 'paused'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'killed';

const STATUS_LABEL: Record<UiStatus, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  'backing-off': 'Backing-off',
  yielded: 'Yielded',
  running: 'Running',
  suspended: 'Suspended',
  paused: 'Paused',
  succeeded: 'Succeeded',
  failed: 'Failed',
  cancelled: 'Cancelled',
  killed: 'Killed',
};

// Same variant/style language as invocation Status.tsx.
const STATUS_VARIANT: Record<
  UiStatus,
  'success' | 'danger' | 'info' | 'warning' | 'default'
> = {
  pending: 'warning',
  scheduled: 'default',
  'backing-off': 'warning',
  yielded: 'default',
  running: 'info',
  suspended: 'default',
  paused: 'warning',
  succeeded: 'success',
  failed: 'danger',
  cancelled: 'default',
  killed: 'default',
};

const styles = tv({
  base: 'relative inline-flex max-w-full items-center gap-1.5',
  variants: {
    status: {
      pending:
        'border-dashed border-amber-300/90 bg-transparent text-amber-700',
      scheduled: 'border-dashed border-zinc-400/60 bg-transparent',
      'backing-off': 'border-dashed border-orange-300/80',
      yielded: 'border-dashed border-zinc-300 bg-transparent text-zinc-500',
      running: 'border-dashed',
      suspended: 'border-dashed border-zinc-400/60 bg-zinc-200/40',
      paused: 'border-dashed',
      succeeded: '',
      failed: '',
      cancelled: '',
      killed: '',
    },
  },
});

// The trailing time per status (what `transitionedAt`/`nextAt` mean), à la
// Status.tsx's StatusTimeline.
const TIME: Record<
  UiStatus,
  {
    prefix?: string;
    suffix?: string;
    field: 'transitionedAt' | 'nextAt';
    title: string;
  }
> = {
  pending: { prefix: 'for', field: 'transitionedAt', title: 'Waiting since' },
  running: { prefix: 'for', field: 'transitionedAt', title: 'Running since' },
  suspended: {
    prefix: 'for',
    field: 'transitionedAt',
    title: 'Suspended since',
  },
  paused: { prefix: 'for', field: 'transitionedAt', title: 'Paused since' },
  yielded: { prefix: 'for', field: 'transitionedAt', title: 'Yielded since' },
  scheduled: { prefix: 'in', field: 'nextAt', title: 'Runs at' },
  'backing-off': { prefix: 'retries in', field: 'nextAt', title: 'Retries at' },
  succeeded: { suffix: 'ago', field: 'transitionedAt', title: 'Succeeded at' },
  failed: { suffix: 'ago', field: 'transitionedAt', title: 'Failed at' },
  cancelled: { suffix: 'ago', field: 'transitionedAt', title: 'Cancelled at' },
  killed: { suffix: 'ago', field: 'transitionedAt', title: 'Killed at' },
};

function resolveStatus(stage?: string, status?: string): UiStatus | undefined {
  switch (stage) {
    case 'running':
      return 'running';
    case 'suspended':
      return 'suspended';
    case 'paused':
      return 'paused';
    case 'inbox':
      if (status === 'scheduled') return 'scheduled';
      if (status === 'backing-off') return 'backing-off';
      if (status === 'yielded') return 'yielded';
      return 'pending';
    case 'finished':
      if (status === 'succeeded') return 'succeeded';
      if (status === 'failed') return 'failed';
      if (status === 'cancelled') return 'cancelled';
      if (status === 'killed') return 'killed';
      return undefined;
    default:
      return undefined;
  }
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

// Extra annotations per status — the row counters the pill can stand on.
function extrasFor(entry: EntryStatusData, ui: UiStatus): string[] {
  const extras: string[] = [];
  switch (ui) {
    case 'backing-off':
      if (entry.retryAttempts)
        extras.push(plural(entry.retryAttempts, 'retry', 'retries'));
      if (entry.numErrors) extras.push(plural(entry.numErrors, 'error'));
      break;
    case 'yielded':
      if (entry.numYields) extras.push(plural(entry.numYields, 'yield'));
      break;
    case 'running':
      if (entry.numAttempts && entry.numAttempts > 1)
        extras.push(`attempt ${entry.numAttempts}`);
      if (entry.hasLock) extras.push('holds lock');
      break;
    case 'suspended':
      if (entry.numSuspensions)
        extras.push(`${entry.numSuspensions}× suspended`);
      if (entry.hasLock) extras.push('holds lock');
      break;
    case 'paused':
      if (entry.numErrors) {
        extras.push(
          `after ${entry.retryAttempts ?? entry.numAttempts ?? 0} attempts`,
        );
      } else if (entry.numPauses) {
        extras.push(`${entry.numPauses}× paused`);
      }
      if (entry.hasLock) extras.push('holds lock');
      break;
    case 'failed':
      if (entry.numErrors) extras.push(plural(entry.numErrors, 'error'));
      if (entry.numAttempts) extras.push(plural(entry.numAttempts, 'attempt'));
      break;
    case 'succeeded':
      if (entry.numAttempts && entry.numAttempts > 1)
        extras.push(plural(entry.numAttempts, 'attempt'));
      break;
    default:
      break;
  }
  return extras;
}

export function EntryStatus({
  entry,
  className,
  showDetail = true,
}: {
  entry: EntryStatusData;
  className?: string;
  showDetail?: boolean;
}) {
  const ui = resolveStatus(entry.stage, entry.status);
  if (!ui) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
      <Badge
        variant={STATUS_VARIANT[ui]}
        size="sm"
        className={styles({ status: ui, className })}
      >
        <Ellipsis visible={ui === 'running'}>{STATUS_LABEL[ui]}</Ellipsis>
      </Badge>
      {showDetail && <Trailing entry={entry} ui={ui} />}
    </div>
  );
}

function Trailing({
  entry,
  ui,
}: {
  entry: EntryStatusData;
  ui: UiStatus;
}): ReactNode {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const spec = TIME[ui];
  const date = entry[spec.field];
  const label = date ? formatDurations(durationSinceLastSnapshot(date)) : '';
  const extras = extrasFor(entry, ui);

  if (!label && extras.length === 0) {
    return null;
  }

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5 text-2xs text-zinc-500/80">
      {label && date && (
        <span className="whitespace-nowrap">
          {spec.prefix && `${spec.prefix} `}
          <DateTooltip date={new Date(date)} title={spec.title}>
            <span className="font-medium text-zinc-500/90 tabular-nums">
              {label}
            </span>
          </DateTooltip>
          {spec.suffix && ` ${spec.suffix}`}
        </span>
      )}
      {extras.length > 0 && (
        <span className="whitespace-nowrap tabular-nums">
          {extras.join(' · ')}
        </span>
      )}
    </span>
  );
}
