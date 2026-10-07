import {
  SidebarNavItem,
  type SidebarLocation,
  type SidebarMatch,
  type SidebarSubItem,
} from '@restate/ui/layout';
import { IconName } from '@restate/ui/icons';
import { HoverTooltip } from '@restate/ui/tooltip';
import { useLocation, useSearchParams } from 'react-router';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { REGISTER_DEPLOYMENT_QUERY } from '@restate/features/register-deployment';
import { ServicePlaygroundSidebarAction } from '@restate/features/service';
import {
  HANDLER_QUERY_PARAM,
  deploymentHref,
  serviceHref,
} from '@restate/util/panel';

interface OverviewSidebarItemProps {
  baseUrl?: string;
  disabled?: boolean;
  preserveSearchParams?: boolean | string[];
}

type OverviewRecent =
  | { type: 'service'; service: string; handler?: string }
  | { type: 'deployment'; deployment: string };

const recentByBaseUrl = new Map<string, OverviewRecent>();
const recentListeners = new Set<() => void>();

function subscribeToRecent(listener: () => void): () => void {
  recentListeners.add(listener);
  return () => recentListeners.delete(listener);
}

function getRecent(baseUrl: string): OverviewRecent | undefined {
  return recentByBaseUrl.get(baseUrl);
}

function setRecent(baseUrl: string, recent: OverviewRecent): void {
  const previous = recentByBaseUrl.get(baseUrl);
  if (previous && isSameRecent(previous, recent)) return;
  recentByBaseUrl.set(baseUrl, recent);
  recentListeners.forEach((listener) => listener());
}

function isSameRecent(a: OverviewRecent, b: OverviewRecent): boolean {
  if (a.type === 'service' && b.type === 'service') {
    return a.service === b.service && a.handler === b.handler;
  }
  if (a.type === 'deployment' && b.type === 'deployment') {
    return a.deployment === b.deployment;
  }
  return false;
}

function singleSegment(prefix: string, pathname: string): string | undefined {
  if (!pathname.startsWith(prefix)) return undefined;
  const segments = pathname.slice(prefix.length).split('/');
  if (segments.length !== 1 || !segments[0]) return undefined;
  return decodeURIComponent(segments[0]);
}

function currentOverviewDetail(
  baseUrl: string,
  pathname: string,
  searchParams: URLSearchParams,
): OverviewRecent | undefined {
  const service = singleSegment(`${baseUrl}/services/`, pathname);
  if (service) {
    const handler = searchParams.get(HANDLER_QUERY_PARAM);
    return { type: 'service', service, ...(handler ? { handler } : {}) };
  }
  const deployment = singleSegment(`${baseUrl}/deployments/`, pathname);
  if (deployment) {
    return { type: 'deployment', deployment };
  }
  return undefined;
}

function truncateId(id: string): string {
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}…${id.slice(-5)}`;
}

function OverviewRecentLabel({ recent }: { recent: OverviewRecent }) {
  const full =
    recent.type === 'service'
      ? [recent.service, recent.handler].filter(Boolean).join('/')
      : recent.deployment;
  return (
    <HoverTooltip
      content={<span className="font-mono whitespace-nowrap">{full}</span>}
      placement="right"
      offset={10}
      className="min-w-0 flex-auto"
    >
      {recent.type === 'service' ? (
        <span className="flex min-w-0 flex-auto items-center gap-1">
          <span className="min-w-0 flex-1 truncate">{recent.service}</span>
          {recent.handler && (
            <>
              <span className="shrink-0 text-zinc-400">/</span>
              <span className="max-w-24 shrink-0 truncate font-mono">
                {recent.handler}
              </span>
            </>
          )}
        </span>
      ) : (
        <span className="min-w-0 flex-auto truncate font-mono">
          {truncateId(recent.deployment)}
        </span>
      )}
    </HoverTooltip>
  );
}

export function OverviewSidebarItem({
  baseUrl = '',
  disabled,
  preserveSearchParams = true,
}: OverviewSidebarItemProps) {
  const path = `${baseUrl}/overview`;
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const current = useMemo(
    () =>
      currentOverviewDetail(
        baseUrl,
        location.pathname,
        new URLSearchParams(location.search),
      ),
    [baseUrl, location.pathname, location.search],
  );
  const recent = useSyncExternalStore(
    subscribeToRecent,
    () => getRecent(baseUrl),
    () => undefined,
  );

  useEffect(() => {
    if (current) setRecent(baseUrl, current);
  }, [baseUrl, current]);

  const carryParams = new URLSearchParams(searchParams);
  carryParams.delete('view');
  Array.from(carryParams.keys()).forEach((key) => {
    if (
      (Array.isArray(preserveSearchParams)
        ? !preserveSearchParams.includes(key)
        : !preserveSearchParams) ||
      key.startsWith('filter_') ||
      key.startsWith('sort_') ||
      key === 'column'
    ) {
      carryParams.delete(key);
    }
  });
  const carryQuery = carryParams.toString();
  const servicesHref = carryQuery ? `${path}?${carryQuery}` : path;
  const deploymentsHref = carryQuery
    ? `${path}?view=deployments&${carryQuery}`
    : `${path}?view=deployments`;

  const servicesMatch: SidebarMatch = (loc) => {
    if (!loc.pathname.startsWith(path)) return false;
    const view = loc.searchParams.get('view');
    return !view || view === 'services';
  };
  const deploymentsMatch: SidebarMatch = (loc) =>
    loc.pathname.startsWith(path) &&
    loc.searchParams.get('view') === 'deployments';

  const visibleRecent = current ?? recent;
  const extraSubItems: SidebarSubItem[] = visibleRecent
    ? [
        {
          href:
            visibleRecent.type === 'service'
              ? serviceHref(baseUrl, visibleRecent)
              : deploymentHref(baseUrl, visibleRecent),
          label: <OverviewRecentLabel recent={visibleRecent} />,
          match: ((sidebarLocation: SidebarLocation) => {
            const candidate = currentOverviewDetail(
              baseUrl,
              sidebarLocation.pathname,
              sidebarLocation.searchParams,
            );
            if (!candidate) return false;
            if (
              candidate.type === 'service' &&
              visibleRecent.type === 'service'
            ) {
              return candidate.service === visibleRecent.service;
            }
            return (
              candidate.type === 'deployment' &&
              visibleRecent.type === 'deployment' &&
              candidate.deployment === visibleRecent.deployment
            );
          }) satisfies SidebarMatch,
          preserveSearchParams,
        },
      ]
    : [];

  return (
    <SidebarNavItem
      href={path}
      match={(loc) =>
        loc.pathname.startsWith(path) ||
        Boolean(currentOverviewDetail(baseUrl, loc.pathname, loc.searchParams))
      }
      icon={IconName.House}
      label="Overview"
      preserveSearchParams={preserveSearchParams}
      disabled={disabled}
      extraSubItems={extraSubItems}
      subItems={[
        {
          href: servicesHref,
          label: 'Services',
          match: servicesMatch,
          preserveSearchParams,
          action: {
            render: ({ className }) => (
              <ServicePlaygroundSidebarAction className={className} />
            ),
          },
        },
        {
          href: deploymentsHref,
          label: 'Deployments',
          match: deploymentsMatch,
          preserveSearchParams,
          action: {
            href: `?${REGISTER_DEPLOYMENT_QUERY}=true`,
            ariaLabel: 'Register deployment',
            icon: IconName.Plus,
            preserveSearchParams: true,
          },
        },
      ]}
    />
  );
}
