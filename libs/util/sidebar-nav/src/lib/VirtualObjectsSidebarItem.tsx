import {
  SidebarNavItem,
  type SidebarLocation,
  type SidebarSubItem,
} from '@restate/ui/layout';
import { Scope } from '@restate/features/vqueue-ui';
import { IconName } from '@restate/ui/icons';
import { HoverTooltip } from '@restate/ui/tooltip';
import {
  formatVirtualObjectInstanceIdentity,
  virtualObjectInstanceHref,
  virtualObjectScopeFromSearch,
  type VirtualObjectInstanceIdentity,
} from '@restate/features/virtual-object-instance';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router';

interface VirtualObjectsSidebarItemProps {
  baseUrl?: string;
  disabled?: boolean;
  preserveSearchParams?: boolean | string[];
}

const recentByPath = new Map<string, VirtualObjectInstanceIdentity>();
const recentListeners = new Set<() => void>();

function subscribeToRecent(listener: () => void): () => void {
  recentListeners.add(listener);
  return () => recentListeners.delete(listener);
}

function getRecent(path: string): VirtualObjectInstanceIdentity | undefined {
  return recentByPath.get(path);
}

function setRecent(
  path: string,
  identity: VirtualObjectInstanceIdentity,
): void {
  recentByPath.set(path, identity);
  recentListeners.forEach((listener) => listener());
}

function currentVirtualObjectInstance(
  path: string,
  pathname: string,
  search: string | URLSearchParams,
): VirtualObjectInstanceIdentity | undefined {
  const prefix = `${path}/`;
  if (!pathname.startsWith(prefix)) return undefined;

  const segments = pathname.slice(prefix.length).split('/');
  if (segments.length !== 2 || !segments[0] || !segments[1]) return undefined;

  const scope = virtualObjectScopeFromSearch(search);

  return {
    service: decodeURIComponent(segments[0]),
    key: decodeURIComponent(segments[1]),
    ...(scope !== undefined ? { scope } : {}),
  };
}

function VirtualObjectInstanceSidebarLabel({
  identity,
}: {
  identity: VirtualObjectInstanceIdentity;
}) {
  const fullIdentity = formatVirtualObjectInstanceIdentity(identity);

  return (
    <HoverTooltip
      content={
        <span className="font-mono whitespace-nowrap">{fullIdentity}</span>
      }
      placement="right"
      offset={10}
      className="min-w-0 flex-auto"
    >
      <span className="flex min-w-0 flex-auto items-center gap-1">
        {identity.scope !== undefined && (
          <Scope
            value={identity.scope}
            className="max-w-16"
            presentation="inline"
            relationship="target"
            labelVariant="compact"
          />
        )}
        <span className="min-w-0 flex-1 truncate">{identity.service}</span>
        <span className="shrink-0 text-zinc-400">/</span>
        <span className="max-w-24 shrink-0 truncate font-mono">
          {identity.key}
        </span>
      </span>
    </HoverTooltip>
  );
}

export function VirtualObjectsSidebarItem({
  baseUrl = '',
  disabled,
  preserveSearchParams = true,
}: VirtualObjectsSidebarItemProps) {
  const path = `${baseUrl}/virtual-objects`;
  const location = useLocation();
  const current = useMemo(
    () =>
      currentVirtualObjectInstance(path, location.pathname, location.search),
    [location.pathname, location.search, path],
  );
  const recent = useSyncExternalStore(
    subscribeToRecent,
    () => getRecent(path),
    () => undefined,
  );

  useEffect(() => {
    if (current) setRecent(path, current);
  }, [current, path]);

  const visibleInstance = current ?? recent;
  const extraSubItems: SidebarSubItem[] = visibleInstance
    ? [
        {
          href: virtualObjectInstanceHref(baseUrl, visibleInstance),
          label: (
            <VirtualObjectInstanceSidebarLabel identity={visibleInstance} />
          ),
          match: ((sidebarLocation: SidebarLocation) => {
            const candidate = currentVirtualObjectInstance(
              path,
              sidebarLocation.pathname,
              sidebarLocation.searchParams,
            );
            return (
              candidate?.service === visibleInstance.service &&
              candidate.key === visibleInstance.key &&
              candidate.scope === visibleInstance.scope
            );
          }) satisfies SidebarSubItem['match'],
          preserveSearchParams,
        },
      ]
    : [];

  return (
    <SidebarNavItem
      href={path}
      icon={IconName.VirtualObject}
      label="Virtual Objects"
      preserveSearchParams={preserveSearchParams}
      disabled={disabled}
      extraSubItems={extraSubItems}
      defaultExpanded={Boolean(visibleInstance)}
    />
  );
}
