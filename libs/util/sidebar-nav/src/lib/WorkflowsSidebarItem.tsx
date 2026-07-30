import type { SidebarLocation, SidebarSubItem } from '@restate/ui/layout';
import { SidebarNavItem } from '@restate/ui/layout';
import { Scope } from '@restate/features/vqueue-ui';
import { IconName } from '@restate/ui/icons';
import { HoverTooltip } from '@restate/ui/tooltip';
import {
  formatWorkflowRunIdentity,
  workflowRunHref,
  workflowScopeFromSearch,
  type WorkflowRunIdentity,
} from '@restate/features/workflow-run';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router';

interface WorkflowsSidebarItemProps {
  baseUrl?: string;
  disabled?: boolean;
  preserveSearchParams?: boolean | string[];
}

const recentByPath = new Map<string, WorkflowRunIdentity>();
const recentListeners = new Set<() => void>();

function subscribeToRecent(listener: () => void): () => void {
  recentListeners.add(listener);
  return () => recentListeners.delete(listener);
}

function getRecent(path: string): WorkflowRunIdentity | undefined {
  return recentByPath.get(path);
}

function setRecent(path: string, identity: WorkflowRunIdentity): void {
  recentByPath.set(path, identity);
  recentListeners.forEach((listener) => listener());
}

function currentWorkflowRun(
  path: string,
  pathname: string,
  search: string | URLSearchParams,
): WorkflowRunIdentity | undefined {
  const prefix = `${path}/`;
  if (!pathname.startsWith(prefix)) return undefined;
  const segments = pathname.slice(prefix.length).split('/');
  if (segments.length !== 2 || !segments[0] || !segments[1]) return undefined;
  const scope = workflowScopeFromSearch(search);
  return {
    service: decodeURIComponent(segments[0]),
    id: decodeURIComponent(segments[1]),
    ...(scope !== undefined ? { scope } : {}),
  };
}

function WorkflowRunSidebarLabel({
  identity,
}: {
  identity: WorkflowRunIdentity;
}) {
  const fullIdentity = formatWorkflowRunIdentity(identity);
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
          {identity.id}
        </span>
      </span>
    </HoverTooltip>
  );
}

export function WorkflowsSidebarItem({
  baseUrl = '',
  disabled,
  preserveSearchParams = true,
}: WorkflowsSidebarItemProps) {
  const path = `${baseUrl}/workflows`;
  const location = useLocation();
  const current = useMemo(
    () => currentWorkflowRun(path, location.pathname, location.search),
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

  const visibleRun = current ?? recent;
  const extraSubItems: SidebarSubItem[] = visibleRun
    ? [
        {
          href: workflowRunHref(baseUrl, visibleRun),
          label: <WorkflowRunSidebarLabel identity={visibleRun} />,
          match: ((sidebarLocation: SidebarLocation) => {
            const candidate = currentWorkflowRun(
              path,
              sidebarLocation.pathname,
              sidebarLocation.searchParams,
            );
            return (
              candidate?.service === visibleRun.service &&
              candidate.id === visibleRun.id &&
              candidate.scope === visibleRun.scope
            );
          }) satisfies SidebarSubItem['match'],
          preserveSearchParams,
        },
      ]
    : [];

  return (
    <SidebarNavItem
      href={path}
      icon={IconName.Workflow}
      label="Workflows"
      preserveSearchParams={preserveSearchParams}
      disabled={disabled}
      extraSubItems={extraSubItems}
      defaultExpanded={Boolean(visibleRun)}
    />
  );
}
