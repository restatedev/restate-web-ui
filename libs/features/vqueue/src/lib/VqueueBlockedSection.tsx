import { useGetVqueue } from '@restate/data-access/admin-api-hooks';
import type { VqueueGateDuration } from '@restate/data-access/admin-api-spec';
import { useIsFeatureFlagEnabled } from '@restate/util/feature-flag';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { HoverTooltip } from '@restate/ui/tooltip';
import { cx } from '@restate/util/styles';
import { formatPercentageWithoutFraction } from '@restate/util/intl';
import { STAGE_TONES, gateLabel, type Tone } from './palette';
import { durationToSeconds, formatVqueueDuration } from './duration';

const AMBER: Tone = {
  fillLight: '#fcd34d',
  stroke: '#f59e0b',
  text: '#b45309',
};

// Visible neutral for the dominant "queued" slice — the inbox tone (zinc-200) is
// too light to read on the gray track.
const QUEUED_TONE: Tone = {
  fillLight: '#d4d4d8',
  stroke: '#a1a1aa',
  text: '#52525b',
};

const EXECUTION_DEF =
  'Time from first start to finish, completed runs only — running plus any suspends, retries, or pauses between attempts.';

// A component carrying less than this share of end-to-end has its verdict muted
// (gray, no amber/green) so a big multiple on a sliver doesn't read as a problem.
const MEANINGFUL_SHARE = 0.05;

function firstGate(blocks?: VqueueGateDuration[]): string | undefined {
  return blocks
    ?.map((b) => ({ gate: b.gate, seconds: durationToSeconds(b.duration) }))
    .filter((i) => i.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds)[0]?.gate;
}

function sumSeconds(blocks?: VqueueGateDuration[]): number {
  return (blocks ?? []).reduce((s, b) => s + durationToSeconds(b.duration), 0);
}

function fmt(seconds: number): string {
  return seconds > 0 ? formatVqueueDuration(seconds * 1000) || '0s' : '0s';
}

function barFill(tone: Tone) {
  return {
    backgroundColor: tone.fillLight,
    outline: `1px solid ${tone.stroke}`,
  };
}

// The ratio pill, matching the Depth "× limit" badge in limits-route (soft -50
// tint + -200 border + dark -700 text). Green below queue avg (less wait, good),
// amber above; neutral gray for about-average, faint gray when muted (a big
// multiple on a negligible slice shouldn't shout).
function ratioColors(ratio: number, muted?: boolean) {
  if (muted) {
    return {
      backgroundColor: '#fafafa',
      borderColor: '#e4e4e7',
      color: '#a1a1aa',
    };
  }
  if (ratio > 1.15) {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      color: '#b45309',
    };
  }
  if (ratio < 0.85) {
    return {
      backgroundColor: '#f0fdf4',
      borderColor: '#bbf7d0',
      color: '#15803d',
    };
  }
  return {
    backgroundColor: '#f4f4f5',
    borderColor: '#e4e4e7',
    color: '#52525b',
  };
}

function CompareVerdict({
  thisSeconds,
  queueAvg,
  muted,
  showQueueAvg,
}: {
  thisSeconds: number;
  queueAvg?: number;
  muted?: boolean;
  showQueueAvg?: boolean;
}) {
  if (!queueAvg || queueAvg <= 0 || thisSeconds <= 0) {
    return <span className="shrink-0 text-0.5xs text-gray-300">—</span>;
  }
  const ratio = thisSeconds / queueAvg;
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-0.5xs whitespace-nowrap">
      <span
        className="inline-flex items-center rounded-md border px-1.5 py-0 text-2xs leading-4 font-medium tabular-nums"
        style={ratioColors(ratio, muted)}
      >
        {ratio.toFixed(1)}×
      </span>
      {showQueueAvg && <span className="text-gray-400">queue avg</span>}
    </span>
  );
}

function CompareLine({
  name,
  tooltip,
  sublabel,
  indent,
  thisSeconds,
  queueAvg,
  share,
}: {
  name: string;
  tooltip?: string;
  sublabel?: string;
  indent?: boolean;
  thisSeconds: number;
  queueAvg?: number;
  share: number;
}) {
  const muted = share < MEANINGFUL_SHARE;
  return (
    <div
      className={cx(
        'flex items-center gap-2 px-2.5 py-1.5 not-last:border-b',
        indent && 'pl-5',
      )}
    >
      <span
        className={cx(
          'flex min-w-0 flex-auto items-center gap-1 text-0.5xs',
          muted ? 'text-gray-400' : 'font-medium text-gray-600',
        )}
      >
        {indent && <span className="font-normal text-gray-300">↳</span>}
        {tooltip ? (
          <HoverTooltip content={tooltip}>
            <span className="border-b border-dotted border-gray-300">
              {name}
            </span>
          </HoverTooltip>
        ) : (
          name
        )}
        {sublabel && (
          <span className="min-w-0 truncate font-normal text-gray-400">
            · {sublabel}
          </span>
        )}
      </span>
      <span
        className={cx(
          'shrink-0 text-0.5xs tabular-nums',
          muted ? 'text-gray-400' : 'font-medium text-zinc-600',
        )}
      >
        {fmt(thisSeconds)}
      </span>
      <CompareVerdict
        thisSeconds={thisSeconds}
        queueAvg={queueAvg}
        muted={muted}
      />
    </div>
  );
}

export function VqueueBlockedSection({
  vqueueId,
  invocationId,
  className,
}: {
  vqueueId?: string;
  invocationId?: string;
  className?: string;
}) {
  const flagEnabled = useIsFeatureFlagEnabled('FEATURE_VQUEUE_OBSERVABILITY');
  const { data } = useGetVqueue(vqueueId, invocationId, {
    enabled: flagEnabled && Boolean(vqueueId),
    refetchInterval: 3_000,
    staleTime: 0,
  });

  const entry = data?.entry;
  if (!flagEnabled || !vqueueId || !entry?.firstRunnableAt) {
    return null;
  }

  const now = Date.now();
  const firstRunnable = new Date(entry.firstRunnableAt).getTime();
  const firstAttempt = entry.firstAttemptAt
    ? new Date(entry.firstAttemptAt).getTime()
    : undefined;
  const finish =
    entry.stage === 'finished' && entry.transitionedAt
      ? new Date(entry.transitionedAt).getTime()
      : now;

  const endToEndS = Math.max(0, (finish - firstRunnable) / 1000);
  if (endToEndS <= 0) {
    return null;
  }
  const queuedS = Math.max(
    0,
    ((firstAttempt ?? finish) - firstRunnable) / 1000,
  );
  const executionS = firstAttempt
    ? Math.max(0, (finish - firstAttempt) / 1000)
    : 0;
  const blockedThisS = sumSeconds(entry.totalBlocks);
  const dominantGate = firstGate(entry.totalBlocks);

  const avgE2ES = durationToSeconds(data?.stageAvg?.endToEnd);
  const avgQueueS = durationToSeconds(data?.stageAvg?.queue);
  const avgExecutionS = Math.max(0, avgE2ES - avgQueueS);
  const avgBlockedS = sumSeconds(data?.head?.avgBlocks);

  const queuedBaseS = Math.max(0, queuedS - blockedThisS);
  const pct = (seconds: number) =>
    formatPercentageWithoutFraction(seconds / endToEndS);

  // queued (with blocked nested under it as ↳, since it's a subset of the queued
  // wait) and execution sit side by side in two columns.
  const queuedLine = (
    <CompareLine
      name="queued"
      thisSeconds={queuedS}
      queueAvg={avgQueueS || undefined}
      share={queuedS / endToEndS}
    />
  );
  const blockedLine = blockedThisS > 0 && (
    <CompareLine
      name="blocked"
      indent
      sublabel={dominantGate && gateLabel(dominantGate)}
      thisSeconds={blockedThisS}
      queueAvg={avgBlockedS || undefined}
      share={blockedThisS / endToEndS}
    />
  );
  const executionLine = executionS > 0 && (
    <CompareLine
      name="execution"
      tooltip={EXECUTION_DEF}
      thisSeconds={executionS}
      queueAvg={avgExecutionS || undefined}
      share={executionS / endToEndS}
    />
  );

  return (
    <Section className={className}>
      <SectionTitle>Timing</SectionTitle>
      <SectionContent className="p-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-b px-2.5 pt-2 pb-2">
          <span className="text-0.5xs font-medium text-gray-500">
            end-to-end
          </span>
          <span className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-zinc-800 tabular-nums">
              {fmt(endToEndS)}
            </span>
            <CompareVerdict
              thisSeconds={endToEndS}
              queueAvg={avgE2ES || undefined}
              showQueueAvg
            />
          </span>
        </div>

        <div className="border-b px-2.5 py-2.5">
          <div className="flex h-3 w-full gap-1 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 p-0.5">
            {queuedS > 0 && (
              <div
                className="flex h-full overflow-hidden rounded-l-full rounded-r-[1px]"
                style={{
                  width: `${(queuedS / endToEndS) * 100}%`,
                  minWidth: 4,
                }}
              >
                <div
                  className="h-full"
                  style={{
                    flexGrow: Math.max(queuedBaseS, 0.0001),
                    flexBasis: 0,
                    ...barFill(QUEUED_TONE),
                  }}
                />
                {blockedThisS > 0 && (
                  <div
                    className="h-full min-w-[3px]"
                    style={{
                      flexGrow: blockedThisS,
                      flexBasis: 0,
                      ...barFill(AMBER),
                    }}
                  />
                )}
              </div>
            )}
            {executionS > 0 && (
              <div
                className="h-full rounded-l-[1px] rounded-r-full"
                style={{
                  width: `${(executionS / endToEndS) * 100}%`,
                  minWidth: 4,
                  ...barFill(STAGE_TONES.running),
                }}
              />
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-3xs text-gray-400">
            <span className="inline-flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-[2px]"
                style={barFill(QUEUED_TONE)}
              />
              queued {pct(queuedS)}
              {blockedThisS > 0 && (
                <span className="text-gray-300">
                  (incl. blocked {pct(blockedThisS)})
                </span>
              )}
            </span>
            {executionS > 0 && (
              <span className="inline-flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-[2px]"
                  style={barFill(STAGE_TONES.running)}
                />
                execution {pct(executionS)}
              </span>
            )}
            <span className="ml-auto text-gray-300">where it went</span>
          </div>
        </div>

        <div className="px-2.5 pt-2 pb-1 text-3xs font-medium text-gray-400">
          vs queue avg
        </div>

        {executionLine ? (
          <div className="grid grid-cols-2">
            <div className="flex min-w-0 flex-col">
              {queuedLine}
              {blockedLine}
            </div>
            <div className="flex min-w-0 flex-col justify-center border-l">
              {executionLine}
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col">
            {queuedLine}
            {blockedLine}
          </div>
        )}
      </SectionContent>
    </Section>
  );
}
