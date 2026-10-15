import type { FeatureFlag } from './type';

export interface FeatureFlagMetadata {
  title: string;
  description: string;
  serverFeature?: string;
}

export const FEATURE_FLAG_METADATA: Record<FeatureFlag, FeatureFlagMetadata> = {
  FEATURE_STATE_STORAGE_BREAKDOWN: {
    title: 'State storage breakdown',
    description: 'Show state storage usage grouped by service.',
  },
  FEATURE_OPERATOR_QUERY_LEVEL: {
    title: 'Operator query level',
    description:
      'Send SQL queries to the admin API with the operator query level.',
  },
  FEATURE_INDEXES_V1: {
    title: 'Index tables',
    description:
      "Use the server's secondary index tables for invocation lists sorted by last transition, virtual object details, and flow control.",
    serverFeature: 'indexes_v1',
  },
};
