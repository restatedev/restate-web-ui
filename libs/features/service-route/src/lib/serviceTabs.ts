import type { ServiceType } from '@restate/data-access/admin-api-spec';

export type ServiceTab =
  | 'invocations'
  | 'runs'
  | 'instances'
  | 'handlers'
  | 'deployments'
  | 'playground';

export type KeyedServiceTab = Extract<ServiceTab, 'runs' | 'instances'>;

const SERVICE_TABS: ServiceTab[] = [
  'invocations',
  'runs',
  'instances',
  'handlers',
  'deployments',
  'playground',
];

export function keyedServiceTab(
  serviceType?: ServiceType,
): KeyedServiceTab | undefined {
  if (serviceType === 'Workflow') return 'runs';
  if (serviceType === 'VirtualObject') return 'instances';
  return undefined;
}

export const TAB_QUERY_PARAM = 'tab';

export function serviceTabFromSearch(
  searchParams: URLSearchParams,
): ServiceTab {
  const tab = searchParams.get(TAB_QUERY_PARAM);
  return SERVICE_TABS.find((candidate) => candidate === tab) ?? 'invocations';
}

export function serviceTabHref(
  searchParams: URLSearchParams,
  tab: ServiceTab,
): string {
  const params = new URLSearchParams(searchParams);
  if (tab === 'invocations') {
    params.delete(TAB_QUERY_PARAM);
  } else {
    params.set(TAB_QUERY_PARAM, tab);
  }
  return `?${params.toString()}`;
}
