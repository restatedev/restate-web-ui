import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { withUiFeatures } from '@restate/data-access-query';
import {
  useIsFeatureFlagEnabled,
  type FeatureFlag,
} from '@restate/util-feature-flag';
import { useAdminBaseUrl } from '../AdminBaseUrlProvider';
import { adminApi } from './adminApi';
import { metaQueryOptions, type MetaSnapshot } from './meta';
import { HookQueryOptions } from './hookTypes';
import { getEnabledUiFeatures } from './uiFeatures';

const EMPTY_FEATURES: Set<string> = new Set();

function selectEnabledFeatures(meta: MetaSnapshot): Set<string> {
  const features = meta.features;
  if (!features) return EMPTY_FEATURES;
  const out = new Set<string>();
  for (const [name, enabled] of Object.entries(features)) {
    if (enabled) out.add(name);
  }
  return out.size === 0 ? EMPTY_FEATURES : out;
}

export function useVersion(options?: HookQueryOptions<'/version', 'get'>) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi('query', '/version', 'get', { baseUrl });

  return useQuery({
    ...queryOptions,
    ...options,
    meta: { ...queryOptions.meta, ...getOverviewRefreshMeta() },
  });
}

/**
 * Enabled features for the current admin baseUrl. Backed by the meta
 * cache (`['meta', baseUrl]`); first read returns the app-registered
 * fallback while `/version` fires in the background.
 */
export function useFeatures(): Set<string> {
  const baseUrl = useAdminBaseUrl();
  const { data } = useQuery({
    ...metaQueryOptions(baseUrl),
    select: selectEnabledFeatures,
  });
  return data ?? EMPTY_FEATURES;
}

export function useQueryHandlerFeatures(): Set<string> {
  const features = useFeatures();
  const isIndexesEnabled = useIsFeatureFlagEnabled('FEATURE_INDEXES_V1');
  return useMemo(() => {
    const flags: Partial<Record<FeatureFlag, boolean>> = {
      FEATURE_INDEXES_V1: isIndexesEnabled,
    };
    return withUiFeatures(
      features,
      getEnabledUiFeatures(features, (flag) => Boolean(flags[flag])),
    );
  }, [features, isIndexesEnabled]);
}

export function useHealth(options?: HookQueryOptions<'/health', 'get'>) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi('query', '/health', 'get', { baseUrl });
  return useQuery({
    ...queryOptions,
    ...options,
    meta: { ...queryOptions.meta, ...getOverviewRefreshMeta() },
  });
}

const QUERY_HEALTH_META_TAG = 'query-health-check';
const OVERVIEW_REFRESH_META_TAG = 'overviewRefresh';

export function getQueryHealthCheckMeta() {
  return { [QUERY_HEALTH_META_TAG]: true };
}

export function getOverviewRefreshMeta() {
  return { [OVERVIEW_REFRESH_META_TAG]: true } as const;
}

export function isOverviewRefreshQuery(query: {
  meta?: Record<string, unknown>;
}) {
  return query.meta?.[OVERVIEW_REFRESH_META_TAG] === true;
}

export function useQueryHealthCheck(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  const baseUrl = useAdminBaseUrl();
  const queryOptions = adminApi('query', '/query', 'post', {
    baseUrl,
    body: { query: 'SELECT 1 FROM sys_invocation_status LIMIT 1' },
  });

  return useQuery({
    ...queryOptions,
    ...options,
    meta: {
      ...queryOptions.meta,
      ...getQueryHealthCheckMeta(),
      ...getOverviewRefreshMeta(),
    },
    retry: false,
  });
}
