import { InvocationPopoverContent } from '@restate/features/invocation-ui';
import { Scope } from '@restate/features/vqueue-ui';
import {
  CrumbContent,
  type BreadcrumbComponentProps,
  type PageDefinition,
} from '@restate/ui/breadcrumbs';
import { Copy } from '@restate/ui/copy';
import { Icon, IconName } from '@restate/ui/icons';
import {
  formatVirtualObjectInstanceIdentity,
  virtualObjectScopeFromSearch,
} from '@restate/features/virtual-object-instance';
import {
  formatWorkflowRunIdentity,
  workflowScopeFromSearch,
} from '@restate/features/workflow-run';

export type CrumbFragment = Omit<PageDefinition, 'pattern'>;

function InvocationCrumbContent({ crumb }: BreadcrumbComponentProps) {
  return (
    <>
      <CrumbContent crumb={crumb} />
      {crumb.isCurrent && (
        <Copy
          copyText={crumb.label}
          className="h-5 w-5 shrink-0 rounded-md p-1 text-gray-500"
        />
      )}
    </>
  );
}

function InvocationCrumbPopover({ crumb }: BreadcrumbComponentProps) {
  return <InvocationPopoverContent id={String(crumb.params['id'] ?? '')} />;
}

function VirtualObjectInstanceCrumbContent({
  crumb,
}: BreadcrumbComponentProps) {
  const queryIndex = crumb.href.indexOf('?');
  const scope = virtualObjectScopeFromSearch(
    queryIndex === -1 ? '' : crumb.href.slice(queryIndex),
  );
  return (
    <>
      <span
        data-crumb-label
        className="flex min-w-0 items-center gap-1 truncate"
      >
        {scope && (
          <Scope
            value={scope}
            className="max-w-24"
            presentation="inline"
            relationship="target"
            showLabel={false}
          />
        )}
        <span className="min-w-0 truncate">
          {crumb.params['service'] ?? ''}
        </span>
        <span className="shrink-0 text-zinc-400">/</span>
        <span className="min-w-0 truncate font-mono text-[90%]">
          {crumb.params['key'] ?? ''}
        </span>
      </span>
      {crumb.isCurrent && (
        <Copy
          copyText={crumb.label}
          className="h-5 w-5 shrink-0 rounded-md p-1 text-gray-500"
        />
      )}
    </>
  );
}

function WorkflowRunCrumbContent({ crumb }: BreadcrumbComponentProps) {
  const queryIndex = crumb.href.indexOf('?');
  const scope = workflowScopeFromSearch(
    queryIndex === -1 ? '' : crumb.href.slice(queryIndex),
  );
  return (
    <>
      <span
        data-crumb-label
        className="flex min-w-0 items-center gap-1 truncate"
      >
        {scope && (
          <Scope
            value={scope}
            className="max-w-24"
            presentation="inline"
            relationship="target"
            showLabel={false}
          />
        )}
        <Icon
          name={IconName.Workflow}
          className="h-3 w-3 shrink-0 text-zinc-400"
        />
        <span className="min-w-0 truncate">
          {crumb.params['service'] ?? ''}
        </span>
        <span className="shrink-0 text-zinc-400">/</span>
        <span className="min-w-0 truncate font-mono text-[90%]">
          {crumb.params['workflowId'] ?? ''}
        </span>
      </span>
      {crumb.isCurrent && (
        <Copy
          copyText={crumb.label}
          className="h-5 w-5 shrink-0 rounded-md p-1 text-gray-500"
        />
      )}
    </>
  );
}

export const overviewCrumb: CrumbFragment = {
  kind: 'list',
  resource: 'overview',
  label: 'Overview',
  icon: IconName.House,
};

export const invocationsCrumb: CrumbFragment = {
  kind: 'list',
  resource: 'invocations',
  label: 'Invocations',
  icon: IconName.Invocation,
};

export const invocationCrumb: CrumbFragment = {
  kind: 'detail',
  resource: 'invocations',
  label: (params) => params['id'] ?? '',
  icon: IconName.Invocation,
  Content: InvocationCrumbContent,
  Popover: InvocationCrumbPopover,
};

export const virtualObjectsCrumb: CrumbFragment = {
  kind: 'list',
  resource: 'virtual-objects',
  label: 'Virtual Objects',
  icon: IconName.VirtualObject,
};

export const virtualObjectInstanceCrumb: CrumbFragment = {
  kind: 'detail',
  resource: 'virtual-objects',
  label: (params, search) => {
    const scope = virtualObjectScopeFromSearch(search);
    return formatVirtualObjectInstanceIdentity({
      service: params['service'] ?? '',
      key: params['key'] ?? '',
      ...(scope ? { scope } : {}),
    });
  },
  icon: IconName.VirtualObject,
  Content: VirtualObjectInstanceCrumbContent,
};

export const workflowsCrumb: CrumbFragment = {
  kind: 'list',
  resource: 'workflows',
  label: 'Workflows',
  icon: IconName.Workflow,
};

export const workflowRunCrumb: CrumbFragment = {
  kind: 'detail',
  resource: 'workflows',
  label: (params, search) => {
    const scope = workflowScopeFromSearch(search);
    return formatWorkflowRunIdentity({
      service: params['service'] ?? '',
      id: params['workflowId'] ?? '',
      ...(scope ? { scope } : {}),
    });
  },
  icon: IconName.Workflow,
  Content: WorkflowRunCrumbContent,
};

export const stateCrumb: CrumbFragment = {
  kind: 'list',
  resource: 'state',
  label: 'State',
  icon: IconName.Database,
};

export const stateObjectCrumb: CrumbFragment = {
  kind: 'detail',
  resource: 'state',
  label: (params) => params['virtualObject'] ?? '',
  icon: IconName.Box,
};

export const introspectionCrumb: CrumbFragment = {
  kind: 'list',
  resource: 'introspection',
  label: 'Introspection',
  icon: IconName.ScanSearch,
};

export const limitRulesCrumb: CrumbFragment = {
  kind: 'list',
  resource: 'limit-rules',
  label: 'Rules',
  icon: IconName.Filters,
};

export const limitCountersCrumb: CrumbFragment = {
  kind: 'list',
  resource: 'limit-counters',
  label: 'Limit counters',
  icon: IconName.Gauge,
};

export const vqueuesCrumb: CrumbFragment = {
  kind: 'list',
  resource: 'vqueues',
  label: 'VQueues',
  icon: IconName.Layers,
};

export function createBreadcrumbPages(options?: {
  patternPrefix?: string;
}): PageDefinition[] {
  const prefix = options?.patternPrefix ?? '';
  return [
    { pattern: `${prefix}/overview`, ...overviewCrumb },
    { pattern: `${prefix}/invocations`, ...invocationsCrumb },
    { pattern: `${prefix}/invocations/:id`, ...invocationCrumb },
    { pattern: `${prefix}/virtual-objects`, ...virtualObjectsCrumb },
    {
      pattern: `${prefix}/virtual-objects/:service/:key`,
      ...virtualObjectInstanceCrumb,
    },
    { pattern: `${prefix}/workflows`, ...workflowsCrumb },
    {
      pattern: `${prefix}/workflows/:service/:workflowId`,
      ...workflowRunCrumb,
    },
    { pattern: `${prefix}/state`, ...stateCrumb },
    { pattern: `${prefix}/state/:virtualObject`, ...stateObjectCrumb },
    { pattern: `${prefix}/introspection`, ...introspectionCrumb },
    { pattern: `${prefix}/flow-control/rules`, ...limitRulesCrumb },
    {
      pattern: `${prefix}/flow-control/counters`,
      ...limitCountersCrumb,
    },
    {
      pattern: `${prefix}/flow-control/vqueues`,
      ...vqueuesCrumb,
    },
  ];
}

export const BREADCRUMB_PAGES: PageDefinition[] = createBreadcrumbPages();
