import {
  SidebarNavItem,
  type SidebarMatch,
  type SidebarSubItem,
} from '@restate/ui/layout';
import { IconName } from '@restate/ui/icons';
import { createSectionOverflow } from './createSectionOverflow';

interface InvocationShortcut {
  id: string;
  label: string;
  filters: { id: string; operation: string; value?: unknown }[];
  sort: { field: string; order: 'ASC' | 'DESC' };
}

const INVOCATION_SHORTCUTS: InvocationShortcut[] = [
  {
    id: 'inflight',
    label: 'In-flight',
    filters: [
      {
        id: 'status',
        operation: 'NOT_IN',
        value: ['succeeded', 'failed', 'cancelled', 'killed'],
      },
    ],
    sort: { field: 'modified_at', order: 'DESC' },
  },
  {
    id: 'stuck',
    label: 'Stuck',
    filters: [
      {
        id: 'status',
        operation: 'IN',
        value: ['pending', 'backing-off', 'suspended', 'paused', 'ready'],
      },
    ],
    sort: { field: 'modified_at', order: 'ASC' },
  },
  {
    id: 'workflow',
    label: 'Workflow runs',
    filters: [
      { id: 'target_service_ty', operation: 'IN', value: ['workflow'] },
      { id: 'target_handler_name', operation: 'IN', value: ['run'] },
    ],
    sort: { field: 'modified_at', order: 'DESC' },
  },
  {
    id: 'vo',
    label: 'Active Virtual Objects',
    filters: [
      {
        id: 'status',
        operation: 'IN',
        value: ['running', 'backing-off', 'suspended', 'paused'],
      },
      { id: 'target_service_ty', operation: 'IN', value: ['virtual_object'] },
    ],
    sort: { field: 'modified_at', order: 'DESC' },
  },
  {
    id: 'idempotent',
    label: 'Idempotent',
    filters: [{ id: 'idempotency_key', operation: 'IS NOT NULL' }],
    sort: { field: 'modified_at', order: 'DESC' },
  },
  {
    id: 'retried',
    label: 'Most retried',
    filters: [{ id: 'retry_count', operation: 'GREATER_THAN', value: 1 }],
    sort: { field: 'retry_count', order: 'DESC' },
  },
  {
    id: 'restarted',
    label: 'Restarted',
    filters: [
      { id: 'invoked_by', operation: 'EQUALS', value: 'restart_as_new' },
    ],
    sort: { field: 'modified_at', order: 'DESC' },
  },
  {
    id: 'scheduled',
    label: 'Scheduled',
    filters: [{ id: 'status', operation: 'IN', value: ['scheduled'] }],
    sort: { field: 'scheduled_start_at', order: 'ASC' },
  },
];

const ALL_INVOCATIONS_SHORTCUT: InvocationShortcut = {
  id: 'all',
  label: 'All',
  filters: [
    { id: 'target_service_name', operation: 'IN', value: [] },
    { id: 'status', operation: 'IN', value: [] },
  ],
  sort: { field: 'modified_at', order: 'DESC' },
};

function shortcutHref(path: string, s: InvocationShortcut): string {
  const params = new URLSearchParams();
  for (const f of s.filters) {
    params.set(
      `filter_${f.id}`,
      JSON.stringify(
        f.value !== undefined
          ? { operation: f.operation, value: f.value }
          : { operation: f.operation },
      ),
    );
  }
  params.set('sort_field', s.sort.field);
  params.set('sort_order', s.sort.order);
  return `${path}?${params.toString()}`;
}

function isFilterParamEmpty(value: string | null): boolean {
  if (!value) return true;
  try {
    const parsed = JSON.parse(value) as { operation?: string; value?: unknown };
    if (parsed.value === undefined) return true;
    if (Array.isArray(parsed.value) && parsed.value.length === 0) return true;
    return false;
  } catch {
    return false;
  }
}

function shortcutMatcher(path: string, s: InvocationShortcut): SidebarMatch {
  return (loc) => {
    if (loc.pathname !== path) return false;

    const requiredFilters = s.filters.filter(
      (f) => !(Array.isArray(f.value) && f.value.length === 0),
    );

    const urlNonEmptyKeys = Array.from(loc.searchParams.entries())
      .filter(([k, v]) => k.startsWith('filter_') && !isFilterParamEmpty(v))
      .map(([k]) => k.slice('filter_'.length));

    if (urlNonEmptyKeys.length !== requiredFilters.length) return false;

    return requiredFilters.every((f) => {
      const param = loc.searchParams.get(`filter_${f.id}`);
      if (!param) return false;
      try {
        const parsed = JSON.parse(param) as {
          operation?: string;
          value?: unknown;
        };
        if (parsed.operation !== f.operation) return false;
        if (f.value === undefined) return true;
        return JSON.stringify(parsed.value) === JSON.stringify(f.value);
      } catch {
        return false;
      }
    });
  };
}

function allMatcher(path: string): SidebarMatch {
  return (loc) => {
    if (loc.pathname !== path) return false;
    const filterKeys = Array.from(loc.searchParams.keys()).filter((k) =>
      k.startsWith('filter_'),
    );
    if (filterKeys.length === 0) return true;
    return filterKeys.every((k) => isFilterParamEmpty(loc.searchParams.get(k)));
  };
}

interface InvocationsSidebarItemProps {
  baseUrl?: string;
  disabled?: boolean;
  preserveSearchParams?: boolean | string[];
}

export function InvocationsSidebarItem({
  baseUrl = '',
  disabled,
  preserveSearchParams = false,
}: InvocationsSidebarItemProps) {
  const path = `${baseUrl}/invocations`;
  const isAll = allMatcher(path);
  const shortcutMatchers = INVOCATION_SHORTCUTS.map((s) =>
    shortcutMatcher(path, s),
  );
  const detailPattern = new RegExp(`^${path}/([^/]+)`);

  const subItems: SidebarSubItem[] = [
    {
      href: shortcutHref(path, ALL_INVOCATIONS_SHORTCUT),
      label: 'All',
      match: isAll,
      preserveSearchParams,
    },
    ...INVOCATION_SHORTCUTS.map((s, i) => ({
      href: shortcutHref(path, s),
      label: s.label,
      match: shortcutMatchers[i],
      preserveSearchParams,
    })),
  ];

  const overflowDynamic = createSectionOverflow({
    sectionMatch: (loc) => loc.pathname === path,
    subItemMatchers: [isAll, ...shortcutMatchers],
    detailMatch: (loc) => detailPattern.test(loc.pathname),
    detailLabel: (loc) => loc.pathname.match(detailPattern)?.[1],
    fallbackLabel: 'Custom query',
  });

  return (
    <SidebarNavItem
      href={shortcutHref(path, ALL_INVOCATIONS_SHORTCUT)}
      icon={IconName.Invocation}
      label="Invocations"
      preserveSearchParams={preserveSearchParams}
      disabled={disabled}
      subItems={subItems}
      visibleSubCount={4}
      overflowDynamic={overflowDynamic}
    />
  );
}
