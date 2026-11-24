import type { AttemptRecord } from './attemptRecord';

export interface ScaleSegment {
  from: number;
  to: number;
  x0: number;
  x1: number;
  isIdle: boolean;
}

export interface WaterfallTick {
  x: number;
  time: number;
}

export interface WaterfallScale {
  start: number;
  end: number;
  segments: ScaleSegment[];
  isCompressed: boolean;
  x: (time: number) => number;
  ticks: WaterfallTick[];
}

const NICE_STEPS = [1, 2, 5];

function niceStep(total: number, count: number) {
  const raw = Math.max(total / count, 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const step of NICE_STEPS) {
    if (step * magnitude >= raw) {
      return step * magnitude;
    }
  }
  return 10 * magnitude;
}

export function idleShare(record: AttemptRecord) {
  const total = Math.max(record.endAt - record.startAt, 1);
  const idle = record.gaps.reduce((sum, gap) => sum + (gap.to - gap.from), 0);
  return Math.min(idle / total, 1);
}

export function buildWaterfallScale(
  record: AttemptRecord,
  compress: boolean,
): WaterfallScale {
  const start = record.startAt;
  const end = Math.max(record.endAt, start + 1);
  const boundaries = new Set<number>([start, end]);
  for (const attempt of record.attempts) {
    boundaries.add(Math.min(Math.max(attempt.startAt, start), end));
    boundaries.add(Math.min(Math.max(attempt.endAt, start), end));
  }
  const points = [...boundaries].sort((a, b) => a - b);

  const raw: { from: number; to: number; isIdle: boolean }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i] as number;
    const to = points[i + 1] as number;
    if (to <= from) {
      continue;
    }
    const isIdle = !record.attempts.some(
      (attempt) => attempt.startAt <= from && attempt.endAt >= to,
    );
    raw.push({ from, to, isIdle });
  }

  const activeTotal = Math.max(
    raw.filter((s) => !s.isIdle).reduce((sum, s) => sum + (s.to - s.from), 0),
    1,
  );
  const weights = raw.map((segment) => {
    const duration = segment.to - segment.from;
    if (!compress) {
      return duration;
    }
    if (segment.isIdle) {
      return Math.min(duration, Math.max(activeTotal * 0.18, 1));
    }
    return Math.max(duration, activeTotal * 0.03);
  });
  const totalWeight = Math.max(
    weights.reduce((sum, w) => sum + w, 0),
    1,
  );

  let cursor = 0;
  const segments: ScaleSegment[] = raw.map((segment, index) => {
    const width = (weights[index] ?? 0) / totalWeight;
    const result = { ...segment, x0: cursor, x1: cursor + width };
    cursor += width;
    return result;
  });

  const x = (time: number) => {
    if (time <= start) {
      return 0;
    }
    if (time >= end) {
      return 1;
    }
    const segment = segments.find((s) => time >= s.from && time <= s.to);
    if (!segment) {
      return (time - start) / (end - start);
    }
    const ratio =
      (time - segment.from) / Math.max(segment.to - segment.from, 1);
    return segment.x0 + ratio * (segment.x1 - segment.x0);
  };

  const ticks: WaterfallTick[] = [];
  if (!compress) {
    const step = niceStep(end - start, 6);
    for (let t = 0; t <= end - start; t += step) {
      ticks.push({ x: x(start + t), time: start + t });
    }
  } else {
    for (const segment of segments) {
      if (segment.isIdle) {
        continue;
      }
      const span = segment.x1 - segment.x0;
      const count = Math.max(1, Math.floor(span / 0.16));
      const step = niceStep(segment.to - segment.from, count);
      const first = Math.ceil((segment.from - start) / step) * step + start;
      ticks.push({ x: segment.x0, time: segment.from });
      for (let t = first; t < segment.to; t += step) {
        ticks.push({ x: x(t), time: t });
      }
    }
  }
  const spaced: WaterfallTick[] = [];
  for (const tick of ticks.sort((a, b) => a.x - b.x)) {
    const last = spaced.at(-1);
    if (!last || tick.x - last.x >= 0.07) {
      spaced.push(tick);
    }
  }

  return { start, end, segments, isCompressed: compress, x, ticks: spaced };
}
