export type ServiceTab =
  | 'invocations'
  | 'handlers'
  | 'deployments'
  | 'playground';

export const TAB_QUERY_PARAM = 'tab';

export function serviceTabFromSearch(
  searchParams: URLSearchParams,
): ServiceTab {
  const tab = searchParams.get(TAB_QUERY_PARAM);
  return tab === 'handlers' || tab === 'deployments' || tab === 'playground'
    ? tab
    : 'invocations';
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
