import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

export const PANEL_QUERY_PARAM = 'panel';

export const SERVICE_QUERY_PARAM = 'service';
export const HANDLER_QUERY_PARAM = 'handler';
export const SERVICE_PLAYGROUND_QUERY_PARAM = 'servicePlayground';
export const INVOCATION_QUERY_NAME = 'invocation';
export const STATE_QUERY_NAME = 'state';
export const DEPLOYMENT_QUERY_PARAM = 'deployment';
export const ONBOARDING_QUERY_PARAM = 'onboarding';

export const PRESERVED_QUERY_PARAMS = [
  SERVICE_PLAYGROUND_QUERY_PARAM,
  SERVICE_QUERY_PARAM,
  DEPLOYMENT_QUERY_PARAM,
  INVOCATION_QUERY_NAME,
  STATE_QUERY_NAME,
  HANDLER_QUERY_PARAM,
  PANEL_QUERY_PARAM,
];

const INVOCATION_LINK_PRESERVED_PARAMS = [
  SERVICE_PLAYGROUND_QUERY_PARAM,
  SERVICE_QUERY_PARAM,
  DEPLOYMENT_QUERY_PARAM,
  INVOCATION_QUERY_NAME,
  ONBOARDING_QUERY_PARAM,
  HANDLER_QUERY_PARAM,
  STATE_QUERY_NAME,
];

export function getSearchParams(
  search: string,
  options?: {
    preserve?: string[];
    remove?: (string | { name: string; value: string })[];
  },
) {
  const preserved = new Set([
    ...INVOCATION_LINK_PRESERVED_PARAMS,
    ...(options?.preserve ?? []),
  ]);
  const searchParams = new URLSearchParams(search);
  Array.from(searchParams.keys()).forEach((key) => {
    if (!preserved.has(key)) {
      searchParams.delete(key);
    }
  });
  options?.remove?.forEach((entry) => {
    if (typeof entry === 'string') {
      searchParams.delete(entry);
    } else {
      searchParams.delete(entry.name, entry.value);
    }
  });
  return '?' + searchParams.toString();
}

export function useActivePanel(): string | null {
  const [searchParams] = useSearchParams();
  return searchParams.get(PANEL_QUERY_PARAM);
}

export function useIsActivePanel(paramName: string): boolean {
  return useActivePanel() === paramName;
}

export function usePanel() {
  const [, setSearchParams] = useSearchParams();

  const open = useCallback(
    (paramName: string, paramValue: string, extra?: Record<string, string>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(paramName, paramValue);
          next.set(PANEL_QUERY_PARAM, paramName);
          if (extra) {
            for (const [key, value] of Object.entries(extra)) {
              next.set(key, value);
            }
          }
          return next;
        },
        { preventScrollReset: true },
      );
    },
    [setSearchParams],
  );

  const close = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const activePanel = next.get(PANEL_QUERY_PARAM);
        next.delete(PANEL_QUERY_PARAM);
        if (activePanel) {
          next.delete(activePanel);
        }
        return next;
      },
      { preventScrollReset: true },
    );
  }, [setSearchParams]);

  return { open, close };
}

export type PanelHrefOpts =
  | { service: string; handler?: string }
  | { invocation: string }
  | { deployment: string }
  | { state: string }
  | { playground: string; handler?: string };

export function panelHref(opts: PanelHrefOpts): string {
  if ('service' in opts) {
    const handler =
      opts.handler !== undefined
        ? `&${HANDLER_QUERY_PARAM}=${opts.handler}`
        : `&${HANDLER_QUERY_PARAM}=`;
    return `?${SERVICE_QUERY_PARAM}=${opts.service}&${PANEL_QUERY_PARAM}=${SERVICE_QUERY_PARAM}${handler}`;
  }
  if ('invocation' in opts) {
    return `?${INVOCATION_QUERY_NAME}=${opts.invocation}&${PANEL_QUERY_PARAM}=${INVOCATION_QUERY_NAME}`;
  }
  if ('deployment' in opts) {
    return `?${DEPLOYMENT_QUERY_PARAM}=${opts.deployment}&${PANEL_QUERY_PARAM}=${DEPLOYMENT_QUERY_PARAM}`;
  }
  if ('state' in opts) {
    return `?${STATE_QUERY_NAME}=${opts.state}&${PANEL_QUERY_PARAM}=${STATE_QUERY_NAME}`;
  }
  if ('playground' in opts) {
    const hash = opts.handler ? `#/operations/${opts.handler}` : '';
    return `?${SERVICE_PLAYGROUND_QUERY_PARAM}=${opts.playground}${hash}`;
  }
  throw new Error('panelHref: unknown panel options');
}
