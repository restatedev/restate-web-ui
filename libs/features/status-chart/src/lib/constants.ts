import {
  getInvocationStatusLabel,
  INBOX_INVOCATION_STATUSES,
  INVOCATION_SUMMARY_STAGES,
  NOT_COMPLETED_INVOCATION_STAGES,
} from '@restate/data-access/admin-api-spec';

const DASHED = { borderType: [8, 4] as number[], borderCap: 'round' as const };

export {
  INBOX_INVOCATION_STATUSES,
  INVOCATION_SUMMARY_STAGES,
  NOT_COMPLETED_INVOCATION_STAGES,
};

export const INBOX_STAGE_GRADIENT =
  'linear-gradient(to right, #e4e4e7 0%, #f4f4f5 22%, #fef9c3 65%, #fde68a 100%)';

export const INBOX_STAGE_LEGEND_GRADIENT =
  'linear-gradient(to right, #e4e4e7 0 50%, #fef9c3 50% 100%)';

export const COMPLETED_STAGE_LEGEND_GRADIENT =
  'linear-gradient(to right, #86efac 0 50%, #fca5a5 50% 100%)';

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
  inbox: {
    fill: '#fef3c7',
    fillLight: '#fef9c3',
    fillDark: '#fde68a',
    stroke: '#fbbf24',
    ...DASHED,
    color: '#f59e0b',
  },
  running: {
    fill: '#60a5fa',
    fillLight: '#93c5fd',
    fillDark: '#3b82f6',
    stroke: '#3b82f6',
    ...DASHED,
    color: '#3b82f6',
  },
  processing: {
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
    ...DASHED,
    color: '#a1a1aa',
  },
  yielded: {
    fill: '#d4d4d8',
    fillLight: '#dddde0',
    fillDark: '#d4d4d8',
    stroke: '#a1a1aa',
    ...DASHED,
    color: '#a1a1aa',
  },
  waiting: {
    fill: '#fbbf24',
    fillLight: '#fcd34d',
    fillDark: '#f59e0b',
    stroke: '#f59e0b',
    ...DASHED,
    color: '#f97316',
  },
  'ready-yielded-backing-off': {
    fill: '#fbbf24',
    fillLight: '#fcd34d',
    fillDark: '#f59e0b',
    stroke: '#f59e0b',
    ...DASHED,
    color: '#f97316',
  },
  scheduled: {
    fill: '#d4d4d8',
    fillLight: '#e4e4e7',
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
  finished: {
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
  cancelled: {
    fill: '#a1a1aa',
    fillLight: '#d4d4d8',
    fillDark: '#71717a',
    stroke: '#71717a',
    color: '#71717a',
  },
  killed: {
    fill: '#a1a1aa',
    fillLight: '#d4d4d8',
    fillDark: '#71717a',
    stroke: '#71717a',
    color: '#71717a',
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
  inbox: 'Inbox',
  running: 'Running',
  processing: 'Processing',
  pending: 'Pending',
  ready: 'Ready',
  yielded: 'Yielded',
  waiting: 'Ready, yielded or backing off',
  'ready-yielded-backing-off': 'Ready, yielded or backing off',
  scheduled: 'Scheduled',
  suspended: 'Suspended',
  succeeded: 'Succeeded',
  finished: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  killed: 'Killed',
  'backing-off': 'Backing off',
  paused: 'Paused',
};

for (const status of Object.keys(STATUS_STYLE)) {
  STATUS_LABELS[status] ??= getInvocationStatusLabel(status) ?? status;
}

export const STATUS_ORDER = [
  'inbox',
  'scheduled',
  'pending',
  'ready',
  'yielded',
  'waiting',
  'backing-off',
  'running',
  'suspended',
  'paused',
  'finished',
  'failed',
  'cancelled',
  'killed',
  'succeeded',
];
