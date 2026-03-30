const DASHED = { borderType: [8, 4] as number[], borderCap: 'round' as const };

export const STATUS_STYLE: Record<
  string,
  {
    fill: string;
    fillLight: string;
    fillDark: string;
    stroke: string;
    borderType?: 'dashed' | number[];
    borderCap?: 'round';
    color: string;
  }
> = {
  running: {
    fill: '#60a5fa',
    fillLight: '#93c5fd',
    fillDark: '#3b82f6',
    stroke: '#3b82f6',
    ...DASHED,
    color: '#3b82f6',
  },
  pending: {
    fill: '#fef3c7',
    fillLight: '#fef9c3',
    fillDark: '#fde68a',
    stroke: '#fbbf24',
    ...DASHED,
    color: '#f59e0b',
  },
  ready: {
    fill: '#d4d4d8',
    fillLight: '#dddde0',
    fillDark: '#d4d4d8',
    stroke: '#a1a1aa',
    color: '#a1a1aa',
  },
  scheduled: {
    fill: '#d4d4d8',
    fillLight: '#dddde0',
    fillDark: '#d4d4d8',
    stroke: '#a1a1aa',
    ...DASHED,
    color: '#a1a1aa',
  },
  suspended: {
    fill: '#a1a1aa',
    fillLight: '#d4d4d8',
    fillDark: '#71717a',
    stroke: '#71717a',
    color: '#71717a',
  },
  succeeded: {
    fill: '#4ade80',
    fillLight: '#86efac',
    fillDark: '#22c55e',
    stroke: '#22c55e',
    color: '#22c55e',
  },
  failed: {
    fill: '#f87171',
    fillLight: '#fca5a5',
    fillDark: '#ef4444',
    stroke: '#ef4444',
    color: '#ef4444',
  },
  'backing-off': {
    fill: '#fbbf24',
    fillLight: '#fcd34d',
    fillDark: '#f59e0b',
    stroke: '#f59e0b',
    ...DASHED,
    color: '#f97316',
  },
  paused: {
    fill: '#fbbf24',
    fillLight: '#fcd34d',
    fillDark: '#f59e0b',
    stroke: '#f59e0b',
    color: '#f59e0b',
  },
};

export const DEFAULT_STYLE: (typeof STATUS_STYLE)[string] = {
  fill: '#a1a1aa',
  fillLight: '#d4d4d8',
  fillDark: '#71717a',
  stroke: '#52525b',
  color: '#a1a1aa',
};

export const STATUS_LABELS: Record<string, string> = {
  running: 'Running',
  pending: 'Pending',
  ready: 'Ready',
  scheduled: 'Scheduled',
  suspended: 'Suspended',
  succeeded: 'Succeeded',
  failed: 'Failed, Cancelled or Killed',
  'backing-off': 'Backing off',
  paused: 'Paused',
};

export const STATUS_ORDER = [
  'ready',
  'scheduled',
  'pending',
  'running',
  'backing-off',
  'suspended',
  'paused',
  'failed',
  'succeeded',
];
