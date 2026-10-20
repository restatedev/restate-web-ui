import {
  getInvocationStatusLabel,
  INBOX_INVOCATION_STATUSES,
  INVOCATION_SUMMARY_STAGES,
  NOT_COMPLETED_INVOCATION_STAGES,
} from '@restate/data-access-admin-api-spec';

const DASHED = { borderType: [8, 4] as number[], borderCap: 'round' as const };

export {
  INBOX_INVOCATION_STATUSES,
  INVOCATION_SUMMARY_STAGES,
  NOT_COMPLETED_INVOCATION_STAGES,
};

export const INBOX_STAGE_GRADIENT =
  'linear-gradient(to right, var(--background-color-emphasis) 0%, var(--background-color-muted) 22%, var(--background-color-pending-muted) 65%, var(--background-color-pending-emphasis) 100%)';

export const INBOX_STAGE_LEGEND_GRADIENT =
  'linear-gradient(to right, var(--background-color-emphasis) 0 50%, var(--background-color-pending-muted) 50% 100%)';

export const COMPLETED_STAGE_LEGEND_GRADIENT =
  'linear-gradient(to right, var(--background-color-success-strong) 0 50%, var(--background-color-danger-strong) 50% 100%)';

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
    fill: 'var(--background-color-pending-muted)',
    fillLight: 'var(--background-color-pending-muted)',
    fillDark: 'var(--background-color-pending-emphasis)',
    stroke: 'var(--background-color-pending-vivid)',
    ...DASHED,
    color: 'var(--background-color-pending)',
  },
  running: {
    fill: 'var(--background-color-info-vivid)',
    fillLight: 'var(--background-color-info-strong)',
    fillDark: 'var(--background-color-info)',
    stroke: 'var(--background-color-info)',
    ...DASHED,
    color: 'var(--background-color-info)',
  },
  processing: {
    fill: 'var(--background-color-info-vivid)',
    fillLight: 'var(--background-color-info-strong)',
    fillDark: 'var(--background-color-info)',
    stroke: 'var(--background-color-info)',
    ...DASHED,
    color: 'var(--background-color-info)',
  },
  pending: {
    fill: 'var(--background-color-pending-muted)',
    fillLight: 'var(--background-color-pending-muted)',
    fillDark: 'var(--background-color-pending-emphasis)',
    stroke: 'var(--background-color-pending-vivid)',
    ...DASHED,
    color: 'var(--background-color-pending)',
  },
  ready: {
    fill: 'var(--background-color-strong)',
    fillLight: 'var(--background-color-emphasis)',
    fillDark: 'var(--background-color-strong)',
    stroke: 'var(--background-color-neutral)',
    ...DASHED,
    color: 'var(--background-color-neutral)',
  },
  yielded: {
    fill: 'var(--background-color-strong)',
    fillLight: 'var(--background-color-emphasis)',
    fillDark: 'var(--background-color-strong)',
    stroke: 'var(--background-color-neutral)',
    ...DASHED,
    color: 'var(--background-color-neutral)',
  },
  waiting: {
    fill: 'var(--background-color-warning-vivid)',
    fillLight: 'var(--background-color-warning-strong)',
    fillDark: 'var(--background-color-warning)',
    stroke: 'var(--background-color-warning)',
    ...DASHED,
    color: 'var(--background-color-warning)',
  },
  'ready-yielded-backing-off': {
    fill: 'var(--background-color-warning-vivid)',
    fillLight: 'var(--background-color-warning-strong)',
    fillDark: 'var(--background-color-warning)',
    stroke: 'var(--background-color-warning)',
    ...DASHED,
    color: 'var(--background-color-warning)',
  },
  scheduled: {
    fill: 'var(--background-color-strong)',
    fillLight: 'var(--background-color-emphasis)',
    fillDark: 'var(--background-color-strong)',
    stroke: 'var(--background-color-neutral)',
    ...DASHED,
    color: 'var(--background-color-neutral)',
  },
  suspended: {
    fill: 'var(--background-color-neutral)',
    fillLight: 'var(--background-color-strong)',
    fillDark: 'var(--background-color-neutral-strong)',
    stroke: 'var(--background-color-neutral-strong)',
    color: 'var(--background-color-neutral-strong)',
  },
  succeeded: {
    fill: 'var(--background-color-success-vivid)',
    fillLight: 'var(--background-color-success-strong)',
    fillDark: 'var(--background-color-success)',
    stroke: 'var(--background-color-success)',
    color: 'var(--background-color-success)',
  },
  finished: {
    fill: 'var(--background-color-success-vivid)',
    fillLight: 'var(--background-color-success-strong)',
    fillDark: 'var(--background-color-success)',
    stroke: 'var(--background-color-success)',
    color: 'var(--background-color-success)',
  },
  failed: {
    fill: 'var(--background-color-danger-vivid)',
    fillLight: 'var(--background-color-danger-strong)',
    fillDark: 'var(--background-color-danger)',
    stroke: 'var(--background-color-danger)',
    color: 'var(--background-color-danger)',
  },
  cancelled: {
    fill: 'var(--background-color-neutral)',
    fillLight: 'var(--background-color-strong)',
    fillDark: 'var(--background-color-neutral-strong)',
    stroke: 'var(--background-color-neutral-strong)',
    color: 'var(--background-color-neutral-strong)',
  },
  killed: {
    fill: 'var(--background-color-neutral)',
    fillLight: 'var(--background-color-strong)',
    fillDark: 'var(--background-color-neutral-strong)',
    stroke: 'var(--background-color-neutral-strong)',
    color: 'var(--background-color-neutral-strong)',
  },
  'backing-off': {
    fill: 'var(--background-color-warning-vivid)',
    fillLight: 'var(--background-color-warning-strong)',
    fillDark: 'var(--background-color-warning)',
    stroke: 'var(--background-color-warning)',
    ...DASHED,
    color: 'var(--background-color-warning)',
  },
  paused: {
    fill: 'var(--background-color-warning-vivid)',
    fillLight: 'var(--background-color-warning-strong)',
    fillDark: 'var(--background-color-warning)',
    stroke: 'var(--background-color-warning)',
    color: 'var(--background-color-warning)',
  },
};

export const DEFAULT_STYLE: (typeof STATUS_STYLE)[string] = {
  fill: 'var(--background-color-neutral)',
  fillLight: 'var(--background-color-strong)',
  fillDark: 'var(--background-color-neutral-strong)',
  stroke: 'var(--border-color-neutral-strong)',
  color: 'var(--background-color-neutral)',
};

export function getStatusFillStyle(style: { fillLight: string }) {
  return {
    backgroundColor: style.fillLight,
    backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, var(--background-color-highlight) 22%, ${style.fillLight}), ${style.fillLight})`,
  };
}

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
  'yielded',
  'ready',
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
