export const OVERVIEW_MODE_PARAM = 'view';

export const OVERVIEW_MODES = ['services', 'deployments', 'handlers'] as const;

export type OverviewMode = (typeof OVERVIEW_MODES)[number];

export function getOverviewMode(value: string | null): OverviewMode {
  if (value === 'deployments') return 'deployments';
  if (value === 'handlers') return 'handlers';
  return 'services';
}
