import { Fragment, type ReactNode } from 'react';
import type {
  InvocationVqueue,
  VqueueGateDuration,
} from '@restate/data-access/admin-api-spec';
import { Icon, IconName } from '@restate/ui/icons';
import { HoverTooltip } from '@restate/ui/tooltip';
import { InvocationId } from '@restate/features/invocation-ui';
import {
  formatNumber,
  formatPercentageWithoutFraction,
} from '@restate/util/intl';
import { tv } from '@restate/util/styles';
import {
  STAGE_LABELS,
  STAGE_TONES,
  type StageKey,
  type Tone,
  raisedFill,
} from './palette';
import { durationToSeconds, formatVqueueDuration } from './duration';
import { AvgBlockBar } from './AvgBlockBar';
import { EntryStatus, type EntryStatusData } from './EntryStatus';

type Counts = NonNullable<InvocationVqueue['counts']>;
type Entry = NonNullable<InvocationVqueue['entry']>;
type StageTime = { raw: string; seconds: number };

// One tick == one invocation while the queue fits; only a large queue scales
// down representatively (so a stage with 1 item never balloons into many ticks).
const TICK_CAP = 15;
// Queue order: waiting (inbox → head) → in progress → done (finished).
const IN_PROGRESS_STAGES: StageKey[] = ['running', 'suspended', 'paused'];
const SHOW_FINISHED = false;
const gridStyles = tv({
  base: 'grid w-full grid-flow-col grid-rows-[auto_auto] items-stretch justify-between gap-y-2',
  variants: {
    showFinished: {
      true: 'grid-cols-[max-content_repeat(4,minmax(8rem,max-content))]',
      false: 'grid-cols-[max-content_repeat(3,minmax(8rem,max-content))]',
    },
  },
});

// The lifecycle statuses each bucket can hold — shown as a hint under the stage
// so the grouping is clear.
const STAGE_INCLUDES: Partial<Record<StageKey, string[]>> = {
  inbox: ['pending', 'scheduled', 'yielded', 'backing-off'],
};
const FINISHED_INCLUDES = ['succeeded', 'failed', 'cancelled', 'killed'];

// Each tick is a mini bar-chart segment: lighter gradient fill, darker stroke
// border, inset white highlight — the same recipe as StatusSummaryBar.
const tick =
  'h-7 w-2 shrink-0 rounded-[3px] border-[1.5px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_1px_2px_0_rgba(0,0,0,0.08)]';

function ticksFor(count: number, total: number): number {
  if (count <= 0) {
    return 0;
  }
  if (total <= TICK_CAP) {
    return count;
  }
  return Math.max(1, Math.round((count / total) * TICK_CAP));
}

// Which bar an entry belongs to is its queue `stage` (the column counts are
// grouped by) — NOT its lifecycle `status` (e.g. a paused entry can be
// "backing-off"). Fall back to status only for servers that don't send a stage.
function stageOf(stage?: string, status?: string): StageKey | undefined {
  if (
    stage === 'inbox' ||
    stage === 'running' ||
    stage === 'suspended' ||
    stage === 'paused'
  ) {
    return stage;
  }
  if (status === 'suspended') return 'suspended';
  if (status === 'paused') return 'paused';
  return undefined;
}

function Comb({
  tone,
  n,
  highlightIndex,
}: {
  tone: Tone;
  n: number;
  highlightIndex: number;
}) {
  return (
    <div className="flex h-9 items-end gap-[2px]">
      {Array.from({ length: n }).map((_, i) =>
        i === highlightIndex ? (
          <span
            key={i}
            className="relative z-10 h-9 w-2 shrink-0 rounded-[3px] border-[1.5px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_0_0_2px_#fff,0_0_0_3.5px_#3f3f46]"
            style={raisedFill(tone)}
          />
        ) : (
          <span key={i} className={tick} style={raisedFill(tone)} />
        ),
      )}
    </div>
  );
}

// The avg time spent in this stage + a bar on a shared scale, so "where a life
// is spent" is comparable across stages. Rendered in the grid's bottom row.
function TimeBar({
  stage,
  time,
  maxSeconds,
  tone,
}: {
  stage: StageKey;
  time: StageTime;
  maxSeconds: number;
  tone: Tone;
}) {
  const width =
    maxSeconds > 0 ? Math.max(6, (time.seconds / maxSeconds) * 100) : 0;
  return (
    <HoverTooltip
      size="lg"
      content={
        <div className="flex flex-col gap-0.5">
          <div className="text-sm font-medium text-gray-100">
            Avg in {STAGE_LABELS[stage].toLowerCase()}
          </div>
          <div className="text-2xs text-gray-400">
            {formatVqueueDuration(time.raw)} per entry · moving average
          </div>
        </div>
      }
    >
      <div className="flex w-fit items-center gap-1.5">
        <span className="text-2xs whitespace-nowrap text-gray-500 tabular-nums">
          <span className="text-gray-400">avg</span>{' '}
          {formatVqueueDuration(time.raw)}
        </span>
        <div className="h-1 w-12 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full"
            style={{ width: `${width}%`, background: tone.stroke }}
          />
        </div>
      </div>
    </HoverTooltip>
  );
}

// The stat block (comb + count + label) with the vertical line — one grid cell,
// the top row of a stage column. `self-stretch` makes every stat block (and the
// head slot beside them) share the tallest block's height, so the head container
// is exactly as tall as the vertical lines.
function StatBlock({
  stage,
  count,
  total,
  n,
  highlightIndex,
  includes,
}: {
  stage: StageKey;
  count: number;
  total: number;
  n: number;
  highlightIndex: number;
  includes?: string[];
}) {
  const tone = STAGE_TONES[stage];
  const pct = total > 0 ? formatPercentageWithoutFraction(count / total) : 0;
  const empty = count <= 0;
  return (
    <div className="relative self-stretch pl-2.5">
      <div
        className="absolute top-0 bottom-0 left-0 w-0.5 rounded-full opacity-50"
        style={{ background: empty ? '#d4d4d8' : tone.stroke }}
      />
      {empty ? (
        <div className="flex h-9 items-end">
          <span className="h-7 w-2 rounded-[3px] border-[1.5px] border-dashed border-gray-300/80 bg-gray-200/40" />
        </div>
      ) : (
        <Comb tone={tone} n={n} highlightIndex={highlightIndex} />
      )}
      <div className="mt-3">
        <div
          className={`text-xl leading-none font-semibold tabular-nums ${
            empty ? 'text-gray-300' : 'text-zinc-500'
          }`}
        >
          {formatNumber(count, true)}
        </div>
        <div className="mt-1 text-2xs whitespace-nowrap text-gray-500 tabular-nums">
          {STAGE_LABELS[stage]} · {pct}
        </div>
        {includes && includes.length > 0 && (
          <div className="mt-1 max-w-28 text-3xs leading-snug text-gray-400">
            {includes.join(' · ')}
          </div>
        )}
      </div>
    </div>
  );
}

// The head entry's id: a state-mutation entry (mut_…) shows a generic icon;
// a real invocation shows its InvocationId chip.
function EntryId({ id }: { id: string }) {
  if (id.startsWith('mut_')) {
    return (
      <HoverTooltip content={id} offset={20}>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border bg-white shadow-xs">
          <Icon
            name={IconName.Database}
            className="h-full w-full p-1 text-zinc-500"
          />
        </span>
      </HoverTooltip>
    );
  }
  return <InvocationId id={id} size="icon" />;
}

export function QueueBar({
  counts,
  blocked,
  headEntryId,
  entry,
  stageTimes,
  maxTimeSeconds,
  nowBlocks = [],
  headStatus,
  statusSlot,
}: {
  counts: Counts;
  blocked: boolean;
  headEntryId?: string;
  entry?: Entry;
  stageTimes: Partial<Record<StageKey, StageTime>>;
  maxTimeSeconds: number;
  nowBlocks?: VqueueGateDuration[];
  headStatus?: EntryStatusData;
  statusSlot?: ReactNode;
}) {
  const running = counts.running ?? 0;
  const finished = counts.finished ?? 0;
  const total =
    (counts.inbox ?? 0) +
      (counts.suspended ?? 0) +
      (counts.paused ?? 0) +
      running || 1;

  const isHeadThisInvocation = Boolean(
    entry && headEntryId && entry.id === headEntryId,
  );
  // Highlight "this invocation" wherever it sits in the queue — but not when it's
  // the head (that's shown in the head box). The stage is what places it in a
  // comb; only the inbox needs a position (resolved below), so we no longer gate
  // the highlight on having one — a running/suspended/paused entry (or an inbox
  // with an empty count) must still light up.
  const highlightStage =
    entry && !isHeadThisInvocation
      ? stageOf(entry.stage, entry.status)
      : undefined;
  const highlightEntry = highlightStage ? entry : undefined;

  const highlightIndexFor = (stage: StageKey, n: number): number => {
    if (!highlightEntry || highlightStage !== stage || n === 0) {
      return -1;
    }
    // The inbox is the only ordered waiting line, so place the tick by the
    // entry's position there. running / suspended / paused are unordered pools —
    // position is meaningless — so just highlight a representative tick.
    const { position, total } = highlightEntry;
    if (stage !== 'inbox' || !position || !total || total <= 1) {
      return n - 1;
    }
    return Math.min(
      n - 1,
      Math.max(0, Math.round((1 - (position - 1) / (total - 1)) * (n - 1))),
    );
  };

  // One stage column (comb + count + label on top, avg-time bar below). Rendered
  // even when empty so the full lifecycle stays legible.
  const renderStage = (stage: StageKey) => {
    const count = counts[stage] ?? 0;
    const n = ticksFor(count, total);
    const time = stageTimes[stage];
    return (
      <Fragment key={stage}>
        <StatBlock
          stage={stage}
          count={count}
          total={total}
          n={n}
          highlightIndex={highlightIndexFor(stage, n)}
          includes={STAGE_INCLUDES[stage]}
        />
        <div className="pl-2.5">
          {time && (
            <TimeBar
              stage={stage}
              time={time}
              maxSeconds={maxTimeSeconds}
              tone={STAGE_TONES[stage]}
            />
          )}
        </div>
      </Fragment>
    );
  };

  // P0D / zero-duration gates slip past the handler's filter; only treat the
  // breakdown as present when at least one gate has a real (> 0) wait.
  const hasNowBlocks = nowBlocks.some(
    (block) => durationToSeconds(block.duration) > 0,
  );
  const inboxN = ticksFor(counts.inbox ?? 0, total);

  return (
    <div className="@container flex flex-col">
      {/* Two grid rows: top = stat blocks + the head slot (all the same height
          via items-stretch, so the head box matches the vertical lines); bottom =
          per-stage avg-time bars. */}
      <div className="overflow-x-auto pt-5">
        <div className={gridStyles({ showFinished: SHOW_FINISHED })}>
          {/* inbox + its head (the front of the inbox, expanded) grouped in one
            column; the remaining stages then spread across the width */}
          <div className="flex items-stretch gap-x-3 self-stretch">
            <StatBlock
              stage="inbox"
              count={counts.inbox ?? 0}
              total={total}
              n={inboxN}
              highlightIndex={highlightIndexFor('inbox', inboxN)}
              includes={STAGE_INCLUDES.inbox}
            />
            {headEntryId && (
              <div className="-mt-4 flex flex-col gap-0 self-start">
                <div className="px-1 text-3xs font-bold tracking-wide text-gray-400 uppercase">
                  Next item
                </div>
                <div className="flex flex-col gap-2 rounded-lg py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <EntryId id={headEntryId} />
                    {headStatus && (
                      <EntryStatus
                        entry={headStatus}
                        showDetail={!blocked}
                        showTime={false}
                      />
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {statusSlot}
                  {blocked && hasNowBlocks && (
                    <div className="min-w-8">
                      <AvgBlockBar blocks={nowBlocks} live showLabel={false} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="pl-2.5">
            {stageTimes.inbox && (
              <TimeBar
                stage="inbox"
                time={stageTimes.inbox}
                maxSeconds={maxTimeSeconds}
                tone={STAGE_TONES.inbox}
              />
            )}
          </div>

          {IN_PROGRESS_STAGES.map(renderStage)}

          {SHOW_FINISHED && (
            <>
              {/* finished — same column rhythm as a stage, just no comb */}
              <div className="relative self-stretch pl-2.5">
                <div className="absolute top-0 bottom-0 left-0 w-0.5 rounded-full bg-gray-300/50" />
                <div className="h-9" />
                <div className="mt-3">
                  <div className="text-xl leading-none font-semibold text-gray-400 tabular-nums">
                    {formatNumber(finished, true)}
                  </div>
                  <div className="mt-1 text-2xs whitespace-nowrap text-gray-500 tabular-nums">
                    Finished
                  </div>
                  <div className="mt-1 max-w-28 text-3xs leading-snug text-gray-400">
                    {FINISHED_INCLUDES.join(' · ')}
                  </div>
                </div>
              </div>
              <div />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
