import { InvocationPopoverContent } from '@restate/features/invocation-ui';
import {
  CrumbContent,
  type BreadcrumbComponentProps,
  type PageDefinition,
} from '@restate/ui/breadcrumbs';
import { Copy } from '@restate/ui/copy';
import { IconName } from '@restate/ui/icons';

export type CrumbFragment = Omit<PageDefinition, 'pattern'>;

function InvocationCrumbContent({ crumb }: BreadcrumbComponentProps) {
  return (
    <>
      <CrumbContent crumb={crumb} />
      {crumb.isCurrent && (
        <Copy
          copyText={crumb.label}
          className="h-5 w-5 shrink-0 rounded-md p-1 text-gray-700"
        />
      )}
    </>
  );
}

function InvocationCrumbPopover({ crumb }: BreadcrumbComponentProps) {
  return <InvocationPopoverContent id={String(crumb.params['id'] ?? '')} />;
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

export function createBreadcrumbPages(options?: {
  patternPrefix?: string;
}): PageDefinition[] {
  const prefix = options?.patternPrefix ?? '';
  return [
    { pattern: `${prefix}/overview`, ...overviewCrumb },
    { pattern: `${prefix}/invocations`, ...invocationsCrumb },
    { pattern: `${prefix}/invocations/:id`, ...invocationCrumb },
    { pattern: `${prefix}/state`, ...stateCrumb },
    { pattern: `${prefix}/state/:virtualObject`, ...stateObjectCrumb },
    { pattern: `${prefix}/introspection`, ...introspectionCrumb },
  ];
}

export const BREADCRUMB_PAGES: PageDefinition[] = createBreadcrumbPages();
