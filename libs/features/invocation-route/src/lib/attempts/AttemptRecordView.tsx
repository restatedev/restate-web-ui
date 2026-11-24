import { Button } from '@restate/ui-button';
import { ContentPanelToolbar } from '@restate/ui-content-panel';
import { Icon, IconName } from '@restate/ui-icons';
import { HoverTooltip } from '@restate/ui-tooltip';
import { tv } from '@restate/util-styles';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { AttemptRecord } from './attemptRecord';
import { AttemptList } from './AttemptList';
import { AttemptWaterfall } from './AttemptWaterfall';
import { formatSpan } from './AttemptParts';
import { buildWaterfallScale, idleShare } from './waterfallScale';

export type AttemptRecordViewMode = 'attempts' | 'waterfall';

const toggleStyles = tv({
  base: 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs',
  variants: {
    isOn: {
      true: 'bg-raised font-medium text-primary shadow-xs',
      false: 'text-muted',
    },
  },
});

function useExpandedAttempts(record: AttemptRecord) {
  const [expanded, setExpanded] = useState(
    () => new Set(record.attempts.map((attempt) => attempt.attempt)),
  );
  const known = useRef(new Set(record.attempts.map((a) => a.attempt)));
  useEffect(() => {
    const added = record.attempts
      .map((attempt) => attempt.attempt)
      .filter((attempt) => !known.current.has(attempt));
    if (added.length > 0) {
      added.forEach((attempt) => known.current.add(attempt));
      setExpanded((current) => new Set([...current, ...added]));
    }
  }, [record]);

  return {
    expanded,
    setOne: (attempt: number, isExpanded: boolean) =>
      setExpanded((current) => {
        const next = new Set(current);
        if (isExpanded) {
          next.add(attempt);
        } else {
          next.delete(attempt);
        }
        return next;
      }),
    expandAll: () =>
      setExpanded(new Set(record.attempts.map((attempt) => attempt.attempt))),
    collapseAll: () => setExpanded(new Set()),
  };
}

export function AttemptRecordView({
  record,
  view,
  title,
  toolbarExtra,
}: {
  record: AttemptRecord;
  view: AttemptRecordViewMode;
  title: ReactNode;
  toolbarExtra?: ReactNode;
}) {
  const { expanded, setOne, expandAll, collapseAll } =
    useExpandedAttempts(record);
  const [compress, setCompress] = useState<boolean>();
  const [focus, setFocus] = useState<number>();
  const focusedRecord = useMemo(() => {
    const attempt = record.attempts.find((item) => item.attempt === focus);
    return attempt
      ? {
          ...record,
          attempts: [attempt],
          gaps: [],
          startAt: attempt.startAt,
          endAt: Math.max(attempt.endAt, attempt.startAt + 1),
        }
      : record;
  }, [record, focus]);
  const isCompressed = compress ?? idleShare(record) > 0.2;
  const scale = useMemo(
    () =>
      buildWaterfallScale(focusedRecord, focus === undefined && isCompressed),
    [focusedRecord, focus, isCompressed],
  );

  const suspensions = record.gaps.filter((gap) => gap.kind === 'suspended');
  const active = record.attempts.reduce(
    (sum, attempt) => sum + (attempt.endAt - attempt.startAt),
    0,
  );
  const allExpanded = record.attempts.every((a) => expanded.has(a.attempt));

  return (
    <div className="flex min-w-0 flex-col gap-3 px-3 pt-3 pb-6">
      <ContentPanelToolbar className="items-center">
        {view === 'waterfall' && focus === undefined && (
          <div className="flex items-center rounded-xl border border-default bg-muted p-0.5">
            <button
              type="button"
              className={toggleStyles({ isOn: !isCompressed })}
              onClick={() => setCompress(false)}
            >
              Real time
            </button>
            <button
              type="button"
              className={toggleStyles({ isOn: isCompressed })}
              onClick={() => setCompress(true)}
            >
              Compress gaps
            </button>
          </div>
        )}
        <HoverTooltip content={allExpanded ? 'Collapse all' : 'Expand all'}>
          <Button
            variant="icon"
            onClick={allExpanded ? collapseAll : expandAll}
            aria-label={allExpanded ? 'Collapse all' : 'Expand all'}
          >
            <Icon
              name={
                allExpanded
                  ? IconName.ListChevronsDownUp
                  : IconName.ListChevronsUpDown
              }
              className="h-4 w-4"
            />
          </Button>
        </HoverTooltip>
        {toolbarExtra}
      </ContentPanelToolbar>
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-default bg-surface px-3.5 py-2.5 text-xs shadow-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-secondary">
          <Icon name={IconName.Restart} className="h-3.5 w-3.5 text-subtle" />
          Explicit recovery
        </span>
        <Stat label="attempts" value={String(record.attempts.length)} />
        <Stat
          label={suspensions.length === 1 ? 'suspension' : 'suspensions'}
          value={String(suspensions.length)}
        />
        <Stat label="running" value={formatSpan(active)} />
        <Stat
          label="end to end"
          value={formatSpan(record.endAt - record.startAt)}
        />
        <span className="basis-full text-muted md:ml-auto md:basis-auto">
          No journal replay: every attempt ran the handler from its first line,
          and each action below belongs only to its attempt.
        </span>
      </div>
      {view === 'attempts' ? (
        <AttemptList
          record={record}
          expanded={expanded}
          onExpandedChange={setOne}
        />
      ) : (
        <div className="min-w-0 overflow-x-auto">
          {focus !== undefined && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent-subtle px-3 py-1.5 text-xs text-accent-strong">
              <Icon name={IconName.ZoomIn} className="h-3.5 w-3.5" />
              Zoomed to attempt {focus}: the time axis starts when it started.
              <Button
                variant="secondary"
                onClick={() => setFocus(undefined)}
                className="ml-auto px-2 py-0.5 text-xs"
              >
                Show every attempt
              </Button>
            </div>
          )}
          <AttemptWaterfall
            record={focusedRecord}
            focusedAttempt={focus}
            onFocusAttempt={setFocus}
            scale={scale}
            title={title}
            expanded={expanded}
            onExpandedChange={setOne}
          />
          <Legend />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="font-semibold text-primary tabular-nums">{value}</span>
      <span className="text-muted">{label}</span>
    </span>
  );
}

const legendSwatch = tv({
  base: 'inline-block shrink-0',
  variants: {
    kind: {
      attempt: 'h-2.5 w-4 rounded-sm bg-success-vivid',
      span: 'h-2 w-4 rounded-sm bg-accent-vivid/70',
      cut: 'h-2 w-4 rounded-sm border border-dashed border-accent bg-accent-vivid/25',
      call: 'h-1.5 w-4 rounded-sm bg-info-vivid/70',
      open: 'h-1.5 w-4 rounded-sm border border-dashed border-info bg-info-vivid/15',
      action: 'h-2 w-2 rotate-45 rounded-[2px] bg-neutral-strong',
      commit: 'h-2.5 w-2.5 rotate-45 rounded-[2px] bg-category-2',
      gap: 'h-2.5 w-4 rounded-sm border border-dashed border-strong bg-subtle',
    },
  },
});

function Legend() {
  const items: [
    NonNullable<Parameters<typeof legendSwatch>[0]>['kind'],
    string,
  ][] = [
    ['attempt', 'attempt'],
    ['span', 'span'],
    ['cut', 'span closed at attempt end'],
    ['call', 'call, until its result'],
    ['open', 'call, no result in the attempt'],
    ['action', 'action'],
    ['commit', 'atomic commit'],
    ['gap', 'between attempts'],
  ];
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-2xs text-muted">
      {items.map(([kind, label]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className={legendSwatch({ kind })} />
          {label}
        </span>
      ))}
    </div>
  );
}
