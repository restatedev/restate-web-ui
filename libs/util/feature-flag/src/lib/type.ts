export const FEATURE_FLAGS = [
  // Temporary, local-only flag to expose virtual-queue observability data
  // (from sys_vqueues). Toggle it on the /features page or via the
  // /feature-flags/<FLAG> route.
  'FEATURE_VQUEUE_OBSERVABILITY',

  'FEATURE_EXECUTION_METRICS',

  'FEATURE_COMPLETION_HISTORY',

  'FEATURE_STATE_STORAGE_BREAKDOWN',
] as const;
export type FeatureFlag = (typeof FEATURE_FLAGS)[number];
