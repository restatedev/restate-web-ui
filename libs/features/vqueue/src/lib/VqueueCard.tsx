import { useState } from 'react';
import type { InvocationVqueue } from '@restate/data-access/admin-api-spec';
import { Target } from '@restate/features/invocation-ui';
import { PatternChip } from '@restate/features/limits-ui';
import { Section, SectionContent } from '@restate/ui/section';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import { formatNumber } from '@restate/util/intl';
import { STAGE_TONES, type StageKey, softTint } from './palette';
import { durationToSeconds } from './duration';
import { QueueBar } from './QueueBar';
import { QueueStats } from './QueueStats';
import { Timeline, type TimelineEvent } from './Timeline';
import { VqueueId } from './VqueueId';
import { VqueueStatus } from './VqueueStatus';

const chipClass =
  'inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-2xs text-gray-600';
const chipLabelClass =
  'text-3xs font-bold tracking-wide text-gray-400 uppercase';
const chevronStyles = tv({
  base: 'h-3.5 w-3.5 text-gray-400 transition-transform',
  variants: { open: { true: 'rotate-90', false: '' } },
});

export function VqueueCard({
  data,
  showService = true,
}: {
  data: InvocationVqueue;
  showService?: boolean;
}) {
  const [showActivity, setShowActivity] = useState(false);
  const identity = data.identity ?? {};
  const counts: NonNullable<InvocationVqueue['counts']> = data.counts ?? {};
  const stageAvg = data.stageAvg ?? {};
  const head = data.head ?? {};
  const nowBlocks = head.nowBlocks ?? [];
  const avgBlocks = head.avgBlocks ?? [];
  const blocked = Boolean(data.status?.blocked);
  const scheduling = data.status?.scheduling;
  const statusBelowHead =
    (scheduling === 'blocked' || scheduling === 'scheduled') &&
    Boolean(head.entryId);
  const blockedResource = data.status?.blockedResource;
  const limitScope =
    identity.scope ??
    blockedResource?.scope ??
    blockedResource?.blockedRule?.split('/')[0];
  const limitKeyValue = identity.limitKey ?? blockedResource?.limitKey;
  const limitPattern = [limitScope, limitKeyValue].filter(Boolean).join('/');

  // Avg time spent per stage (inbox/running/suspended), shown as comparison
  // bars under each stage; their sum is the end-to-end caption.
  const stageTimes: Partial<
    Record<StageKey, { raw: string; seconds: number }>
  > = {};
  (
    [
      ['inbox', stageAvg.inbox],
      ['running', stageAvg.running],
      ['suspended', stageAvg.suspended],
    ] as [StageKey, string | undefined][]
  ).forEach(([key, raw]) => {
    const seconds = durationToSeconds(raw);
    if (raw && seconds > 0) {
      stageTimes[key] = { raw, seconds };
    }
  });
  const maxTimeSeconds = Math.max(
    0,
    ...Object.values(stageTimes).map((t) => t.seconds),
  );
  const sumSeconds = Object.values(stageTimes).reduce(
    (sum, t) => sum + t.seconds,
    0,
  );
  // Prefer the real metrics (avg_queue_duration / avg_end_to_end_duration);
  // fall back to the sum of stage averages for end-to-end on older servers.
  const queueSeconds = durationToSeconds(stageAvg.queue);
  const e2eSeconds = durationToSeconds(stageAvg.endToEnd) || sumSeconds;

  const events = data.events ?? {};
  const timelineEvents: TimelineEvent[] = [
    {
      key: 'enqueued',
      label: 'last enqueued',
      value: events.enqueuedAt,
      color: STAGE_TONES.inbox.stroke,
    },
    {
      key: 'start',
      label: 'last started',
      value: events.startAt,
      color: STAGE_TONES.running.stroke,
    },
    {
      key: 'run',
      label: 'last attempt',
      value: events.attemptAt,
      color: '#3b82f6',
    },
    {
      key: 'finish',
      label: 'last finished',
      value: events.finishAt,
      color: '#22c55e',
    },
  ];
  const serviceLink =
    showService && identity.service ? (
      <Target
        target={identity.service}
        showHandler={false}
        className="h-6 flex-initial [&_[data-target]]:h-6"
      />
    ) : null;
  const finishedCount = counts.finished ?? 0;
  const showSubtitle = Boolean(
    (identity.vqueueId && serviceLink) ||
    identity.objectKey ||
    limitPattern ||
    identity.isPaused ||
    finishedCount > 0,
  );

  return (
    <div className="flex w-full flex-col gap-6">
      {/* the queue card: header (id + status), body (visualisation), footer
          (timeline) */}
      <Section className="border bg-gray-200/50 p-0">
        {/* header — id + status on the left, service / key / limit on the right */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-2 py-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {identity.vqueueId ? (
              <VqueueId id={identity.vqueueId} />
            ) : (
              (serviceLink ?? (
                <span className="text-sm font-semibold text-zinc-700">
                  Queue
                </span>
              ))
            )}
            {!statusBelowHead && <VqueueStatus data={data} variant="default" />}
          </div>
          {showSubtitle && (
            <div className="flex flex-wrap items-center gap-1.5">
              {identity.vqueueId && serviceLink}
              {identity.objectKey && (
                <span className={`${chipClass} font-mono`}>
                  <span className={chipLabelClass}>key</span>
                  {identity.objectKey}
                </span>
              )}
              {identity.isPaused && (
                <span
                  className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-2xs font-medium"
                  style={softTint(STAGE_TONES.paused)}
                >
                  Paused
                </span>
              )}
              {limitPattern && <PatternChip pattern={limitPattern} />}
              {finishedCount > 0 && (
                <span className="inline-flex items-baseline gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-2xs text-gray-500">
                  <span className="font-semibold text-zinc-700 tabular-nums">
                    {formatNumber(finishedCount, true)}
                  </span>
                  finished
                </span>
              )}
            </div>
          )}
        </div>

        {/* body — the queue: inboxed · suspended · paused → head → running →
            finished */}
        <SectionContent
          raised
          className="border-white/50 bg-linear-to-b from-gray-50 to-gray-50/80 px-2 pt-2 pb-5 shadow-zinc-800/3 sm:px-4"
        >
          <QueueBar
            counts={counts}
            blocked={blocked}
            headEntryId={head.entryId}
            entry={data.entry}
            stageTimes={stageTimes}
            maxTimeSeconds={maxTimeSeconds}
            nowBlocks={nowBlocks}
            headStatus={head}
            statusSlot={
              statusBelowHead ? (
                <VqueueStatus data={data} variant="mini" />
              ) : null
            }
          />
        </SectionContent>

        {/* footer — collapsible recent-activity (collapsed by default) */}
        <div className="px-2 pt-3 pb-1">
          <div className="flex flex-wrap items-start gap-x-6 gap-y-2 px-1">
            <button
              type="button"
              onClick={() => setShowActivity((open) => !open)}
              aria-expanded={showActivity}
              className="-mx-1 flex shrink-0 flex-col gap-0.5 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-black/3"
            >
              <span className="flex items-center gap-1.5 text-2xs font-medium text-gray-500">
                <Icon
                  name={IconName.ChevronRight}
                  className={chevronStyles({ open: showActivity })}
                />
                <span>
                  Recent activity and stats{' '}
                  <span className="text-2xs text-gray-400">
                    (across the queue)
                  </span>
                </span>
              </span>
            </button>
            {showActivity && (
              <div className="flex min-w-0 flex-1 justify-end">
                <QueueStats
                  queueSeconds={queueSeconds}
                  e2eSeconds={e2eSeconds}
                  avgBlocks={avgBlocks}
                  blocked={blocked}
                />
              </div>
            )}
          </div>
          {showActivity && (
            <div className="mt-5">
              <Timeline events={timelineEvents} />
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
