// Colours come from the app's status system (see status-chart/constants.ts):
// running = blue, suspended = zinc, pending/paused = amber, succeeded = green,
// failed = red. Every fill below pairs a light fill with a stronger stroke, and
// segments/arcs are rendered with the same "raised" recipe the StatusSummaryBar
// and StatusArcEcharts use (light fill + top-white gradient + stroke border).

export interface Tone {
  // Light fill used as the segment/arc background (gradient base).
  fillLight: string;
  // Border / arc stroke.
  stroke: string;
  // Readable text colour for labels.
  text: string;
}

export type StageKey = 'inbox' | 'running' | 'suspended' | 'paused';

// Drawn from the app's status palette (status-chart/constants.ts). The grey
// stages keep the "ready"/"suspended" fills but use lighter strokes than
// STATUS_STYLE: these ticks are thin, so a dark 1.5px border would dominate and
// read darker than the light status arcs — a lighter stroke keeps the fill the
// colour you actually see.
export const STAGE_TONES: Record<StageKey, Tone> = {
  // Waiting in the queue, ready to dispatch — the app's "ready" (kept lightest).
  inbox: { fillLight: '#e4e4e7', stroke: '#c4c4c8', text: '#71717a' },
  // Executing — the app's "running" (blue).
  running: { fillLight: '#93c5fd', stroke: '#3b82f6', text: '#2563eb' },
  // Suspended — the app's "suspended" (light zinc fill, mid-zinc stroke).
  suspended: { fillLight: '#d4d4d8', stroke: '#a1a1aa', text: '#52525b' },
  // User-paused — the app's "paused" (amber).
  paused: { fillLight: '#fcd34d', stroke: '#f59e0b', text: '#a16207' },
};

export const STAGE_LABELS: Record<StageKey, string> = {
  inbox: 'Inbox',
  running: 'Running',
  suspended: 'Suspended',
  paused: 'Paused',
};

// Gates (blocking reasons). The app has no native gate palette, so these are
// drawn from the same Tailwind 300/500 family as the status colours to feel
// consistent while staying distinguishable.
export const GATE_TONES: Record<string, Tone> = {
  concurrency_rules: {
    fillLight: '#a5b4fc',
    stroke: '#6366f1',
    text: '#4f46e5',
  },
  throttling_rules: {
    fillLight: '#c4b5fd',
    stroke: '#8b5cf6',
    text: '#7c3aed',
  },
  invoker_concurrency: {
    fillLight: '#5eead4',
    stroke: '#14b8a6',
    text: '#0d9488',
  },
  invoker_throttling: {
    fillLight: '#fda4af',
    stroke: '#f43f5e',
    text: '#e11d48',
  },
  invoker_memory: { fillLight: '#d8b4fe', stroke: '#a855f7', text: '#9333ea' },
  lock: { fillLight: '#fcd34d', stroke: '#f59e0b', text: '#b45309' },
  deployment_concurrency: {
    fillLight: '#93c5fd',
    stroke: '#3b82f6',
    text: '#2563eb',
  },
};

export const GATE_LABELS: Record<string, string> = {
  concurrency_rules: 'rules',
  throttling_rules: 'throttle-rules',
  invoker_concurrency: 'inv-conc',
  invoker_throttling: 'inv-throttle',
  invoker_memory: 'inv-mem',
  lock: 'lock',
  deployment_concurrency: 'dep-conc',
};

const NEUTRAL_TONE: Tone = {
  fillLight: '#d4d4d8',
  stroke: '#a1a1aa',
  text: '#52525b',
};

export function gateTone(gate?: string | null): Tone {
  return (gate && GATE_TONES[gate]) || NEUTRAL_TONE;
}

export function gateLabel(gate?: string | null): string {
  return (gate && (GATE_LABELS[gate] ?? gate)) || 'unknown';
}

// The app's "raised" segment fill: light base + a subtle top-white gradient +
// stroke border. Returned as inline style (data-driven colour). Pair with the
// segment className (border width + rounding + inset highlight/shadow).
export function raisedFill(tone: Tone) {
  return {
    backgroundColor: tone.fillLight,
    backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, white 22%, ${tone.fillLight}), ${tone.fillLight})`,
    borderColor: tone.stroke,
  };
}

// A pale "badge"-style tint (matches Badge's bg-*-50 / border-*-600/20 /
// text-*-700 recipe) for chips and the verdict pill.
export function softTint(tone: Tone) {
  return {
    backgroundColor: `color-mix(in srgb, ${tone.stroke} 9%, white)`,
    borderColor: `color-mix(in srgb, ${tone.stroke} 28%, white)`,
    color: tone.text,
  };
}

// A monochrome amber ramp (darkest first) for colouring segments by rank rather
// than category — the biggest reads darkest, fading to lighter amber.
const AMBER_RAMP: Tone[] = [
  { fillLight: '#fbbf24', stroke: '#f59e0b', text: '#b45309' }, // amber-400
  { fillLight: '#fcd34d', stroke: '#eab308', text: '#a16207' }, // amber-300
  { fillLight: '#fde047', stroke: '#facc15', text: '#a16207' }, // yellow-300
  { fillLight: '#fef08a', stroke: '#fde047', text: '#a16207' }, // yellow-200
  { fillLight: '#fef9c3', stroke: '#fde047', text: '#a16207' }, // yellow-100
];
const AMBER_FALLBACK: Tone = {
  fillLight: '#fcd34d',
  stroke: '#f59e0b',
  text: '#b45309',
};

export function amberShade(rank: number): Tone {
  const i = Math.min(Math.max(rank, 0), AMBER_RAMP.length - 1);
  return AMBER_RAMP[i] ?? AMBER_FALLBACK;
}
