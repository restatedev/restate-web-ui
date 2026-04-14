export const OVERVIEW_MODE_PARAM = 'view';

export const OVERVIEW_MODES = ['services', 'deployments'] as const;

export type OverviewMode = (typeof OVERVIEW_MODES)[number];

export function getOverviewMode(value: string | null): OverviewMode {
  return value === 'deployments' ? 'deployments' : 'services';
}
