export const FEATURE_FLAGS = [
  'FEATURE_OVERVIEW_PAGE',
  'FEATURE_INVOCATIONS_PAGE',
  // Temporary, local-only flag: resolve backing-off status and next_retry_at
  // for vqueue-backed invocations from sys_vqueues. Flip it via the
  // /feature-flags/<FLAG> route (see apps/web-ui routes/feature-flags.tsx).
  'FEATURE_VQUEUE_STATUS',

  'FEATURE_EXECUTION_METRICS',
] as const;
export type FeatureFlag = (typeof FEATURE_FLAGS)[number];
