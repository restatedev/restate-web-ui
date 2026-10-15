export const PANEL_QUERY_PARAM = 'panel';

const SERVICE_QUERY_PARAM = 'service';
export const HANDLER_QUERY_PARAM = 'handler';
export const SERVICE_PLAYGROUND_QUERY_PARAM = 'servicePlayground';
export const ONBOARDING_QUERY_PARAM = 'onboarding';

export const PRESERVED_QUERY_PARAMS = [
  SERVICE_PLAYGROUND_QUERY_PARAM,
  PANEL_QUERY_PARAM,
];

const INVOCATION_LINK_PRESERVED_PARAMS = [
  SERVICE_PLAYGROUND_QUERY_PARAM,
  SERVICE_QUERY_PARAM,
  ONBOARDING_QUERY_PARAM,
];

export function getSearchParams(search: string) {
  const preserved = new Set(INVOCATION_LINK_PRESERVED_PARAMS);
  const searchParams = new URLSearchParams(search);
  Array.from(searchParams.keys()).forEach((key) => {
    if (!preserved.has(key)) {
      searchParams.delete(key);
    }
  });
  return '?' + searchParams.toString();
}

export function panelHref({
  playground,
  handler,
}: {
  playground: string;
  handler?: string;
}): string {
  const hash = handler ? `#/operations/${handler}` : '';
  return `?${SERVICE_PLAYGROUND_QUERY_PARAM}=${playground}${hash}`;
}

export function serviceHref(
  baseUrl: string,
  { service, handler }: { service: string; handler?: string | null },
): string {
  const search = handler
    ? `?${HANDLER_QUERY_PARAM}=${encodeURIComponent(handler)}`
    : '';
  return `${baseUrl}/services/${encodeURIComponent(service)}${search}`;
}

export function deploymentHref(
  baseUrl: string,
  { deployment, tab }: { deployment: string; tab?: 'invocations' },
): string {
  const search = tab ? `?tab=${tab}` : '';
  return `${baseUrl}/deployments/${encodeURIComponent(deployment)}${search}`;
}
