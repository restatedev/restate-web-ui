import type { InvocationVqueue } from '@restate/data-access/admin-api-spec';
import { Target } from '@restate/features/invocation-ui';
import { Section, SectionContent } from '@restate/ui/section';
import { STAGE_TONES, type StageKey, softTint } from './palette';
import { durationToSeconds, formatVqueueDuration } from './duration';
import { QueueBar } from './QueueBar';
import { QueueStats } from './QueueStats';
import { Timeline, type TimelineEvent } from './Timeline';
import { VqueueId } from './VqueueId';
import { VqueueStatus } from './VqueueStatus';

const chipClass =
  'inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-2xs text-gray-600';
const chipLabelClass =
  'text-3xs font-bold tracking-wide text-gray-400 uppercase';

export function VqueueCard({ data }: { data: InvocationVqueue }) {
  const identity = data.identity ?? {};
  const counts: NonNullable<InvocationVqueue['counts']> = data.counts ?? {};
  const stageAvg = data.stageAvg ?? {};
  const head = data.head ?? {};
  const nowBlocks = head.nowBlocks ?? [];
  const avgBlocks = head.avgBlocks ?? [];
  const blocked = Boolean(data.status?.blocked);

  // The head's longest live wait — drives its "blocked for <duration>" line.
  const dominantBlock = [...nowBlocks].sort(
    (a, b) => durationToSeconds(b.duration) - durationToSeconds(a.duration),
  )[0];
  const headDurationLabel = dominantBlock
    ? formatVqueueDuration(dominantBlock.duration)
    : undefined;

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
  const serviceLink = identity.service ? (
    <Target
      target={identity.service}
      showHandler={false}
      className="flex-initial"
    />
  ) : null;
  const showSubtitle = Boolean(
    (identity.vqueueId && serviceLink) ||
    identity.objectKey ||
    identity.limitKey ||
    identity.isPaused,
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      {/* the queue card: header (id + status), body (visualisation), footer
          (timeline) */}
      <Section>
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
            <VqueueStatus data={data} />
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
              {identity.limitKey && (
                <span className={`${chipClass} font-mono`}>
                  <span className={chipLabelClass}>limit</span>
                  {[identity.scope, identity.limitKey]
                    .filter(Boolean)
                    .join('/')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* body — the queue: inboxed · suspended · paused → head → running →
            finished */}
        <SectionContent raised className="px-2 pt-2 pb-5 sm:px-4">
          <QueueBar
            counts={counts}
            blocked={blocked}
            durationLabel={headDurationLabel}
            headEntryId={head.entryId}
            entry={data.entry}
            stageTimes={stageTimes}
            maxTimeSeconds={maxTimeSeconds}
            nowBlocks={nowBlocks}
            headStatus={head}
          />
        </SectionContent>

        {/* footer — title + stats (bars) on one row, timeline below */}
        <div className="px-2 pt-3 pb-1">
          <div className="mb-5 flex flex-wrap items-start gap-x-6 gap-y-2 px-1">
            <div className="flex shrink-0 flex-col gap-0.5">
              <span className="text-2xs font-medium text-gray-500">
                Recent activity and stats
              </span>
              <span className="text-2xs text-gray-400">(across the queue)</span>
            </div>
            <div className="flex min-w-0 flex-1 justify-end">
              <QueueStats
                queueSeconds={queueSeconds}
                e2eSeconds={e2eSeconds}
                avgBlocks={avgBlocks}
                blocked={blocked}
              />
            </div>
          </div>
          <Timeline events={timelineEvents} />
        </div>
      </Section>
    </div>
  );
}
