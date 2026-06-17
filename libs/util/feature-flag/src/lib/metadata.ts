import type { FeatureFlag } from './type';

export interface FeatureFlagMetadata {
  title: string;
  description: string;
  // Whether flipping the flag currently changes anything in the UI. Flags that
  // are wired up but not yet backed by functionality are surfaced as read-only.
  available: boolean;
}

export const FEATURE_FLAG_METADATA: Record<FeatureFlag, FeatureFlagMetadata> = {
  FEATURE_VQUEUE_OBSERVABILITY: {
    title: 'Virtual queue observability',
    description: 'Expose virtual-queue observability data for invocations.',
    available: false,
  },
  FEATURE_EXECUTION_METRICS: {
    title: 'Execution metrics',
    description:
      "Expose the Restate server's execution metrics — throughput, capacity, and ingress activity.",
    available: true,
  },
};
