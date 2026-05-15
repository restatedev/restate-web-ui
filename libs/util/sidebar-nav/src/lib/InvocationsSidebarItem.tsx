import {
  SidebarNavItem,
  type SidebarLocation,
  type SidebarMatch,
  type SidebarSubItem,
} from '@restate/ui/layout';
import { IconName } from '@restate/ui/icons';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import {
  getInvocationsRecent,
  subscribeInvocationsRecent,
  type InvocationsRecent,
} from './invocationsRecent';

// ─────────────────────────────────────────────────────────────
// Preset definitions
// ─────────────────────────────────────────────────────────────

interface InvocationShortcut {
  id: string;
  label: string;
  filters: { id: string; operation: string; value?: unknown }[];
  sort?: { field: string; order: 'ASC' | 'DESC' };
  columns?: string[];
}

// Mirror of setDefaultColumns in invocations-route/columns.tsx. Kept in
// lockstep manually since this file can't depend on the feature lib.
const DEFAULT_PRESET_COLUMNS = [
  'id',
  'created_at',
  'modified_at',
  'duration',
  'target',
  'status',
];

// Operations that are meaningful on their own (no value required).
const VALUELESS_OPERATIONS = new Set(['IS NULL', 'IS NOT NULL']);

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
  },
  {
    id: 'idempotent',
    label: 'Idempotent',
    filters: [{ id: 'idempotency_key', operation: 'IS NOT NULL' }],
    columns: [...DEFAULT_PRESET_COLUMNS, 'idempotency_key'],
  },
  {
    id: 'retried',
    label: 'Most retried',
    filters: [{ id: 'retry_count', operation: 'GREATER_THAN', value: 1 }],
    sort: { field: 'retry_count', order: 'DESC' },
    columns: [...DEFAULT_PRESET_COLUMNS, 'retry_count'],
  },
  {
    id: 'restarted',
    label: 'Restarted',
    filters: [
      { id: 'invoked_by', operation: 'EQUALS', value: 'restart_as_new' },
    ],
    columns: [...DEFAULT_PRESET_COLUMNS, 'restarted_from'],
  },
  {
    id: 'scheduled',
    label: 'Scheduled',
    filters: [{ id: 'status', operation: 'IN', value: ['scheduled'] }],
    sort: { field: 'scheduled_start_at', order: 'ASC' },
    columns: [...DEFAULT_PRESET_COLUMNS, 'scheduled_start_at'],
  },
];

const ALL_INVOCATIONS_SHORTCUT: InvocationShortcut = {
  id: 'all',
  label: 'All',
  filters: [
    { id: 'target_service_name', operation: 'IN', value: [] },
    { id: 'status', operation: 'IN', value: [] },
  ],
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
  if (s.sort) {
    params.set('sort_field', s.sort.field);
    params.set('sort_order', s.sort.order);
  }
  if (s.columns) {
    for (const col of s.columns) {
      params.append('column', col);
    }
  }
  return `${path}?${params.toString()}`;
}

// ─────────────────────────────────────────────────────────────
// URL classification
//
// Every /invocations URL falls into exactly one of these buckets. Computing
// the bucket once lets sub-item matchers, the Custom-query detection and the
// exported `matchesAnyInvocationPreset` all derive from a single source of
// truth instead of re-implementing the same parsing logic.
//
//   - 'detail': on `/invocations/{id}`. `id` is the invocation id; drives
//               the "{id}" extra sub-item.
//   - 'all':    on `/invocations` with no non-empty filters — the baseline
//               "show everything recent" view. Matches the All sidebar item.
//   - 'preset': on `/invocations` and the URL's filter set matches one of
//               the named shortcuts (In-flight, Stuck, Workflow runs, …).
//               `id` is the shortcut id, used to highlight that sub-item.
//   - 'custom': on `/invocations` but the URL doesn't match 'all' or any
//               preset — the user built their own filter combination. This
//               drives the "Custom query" extra sub-item.
//   - null:     not in the invocations section at all.
// ─────────────────────────────────────────────────────────────

type InvocationsUrlKind =
  | { kind: 'detail'; id: string }
  | { kind: 'all' }
  | { kind: 'preset'; id: string }
  | { kind: 'custom' }
  | null;

function isFilterParamEmpty(value: string | null): boolean {
  if (!value) return true;
  try {
    const parsed = JSON.parse(value) as { operation?: string; value?: unknown };
    if (parsed.operation && VALUELESS_OPERATIONS.has(parsed.operation)) {
      return false;
    }
    if (parsed.value === undefined) return true;
    if (Array.isArray(parsed.value) && parsed.value.length === 0) return true;
    return false;
  } catch {
    return false;
  }
}

function urlMatchesShortcut(
  searchParams: URLSearchParams,
  s: InvocationShortcut,
): boolean {
  // A filter with an empty-array value is a no-op marker on both sides —
  // it doesn't count toward the required set or the URL's effective filters.
  const required = s.filters.filter(
    (f) => !(Array.isArray(f.value) && f.value.length === 0),
  );
  const urlNonEmpty = Array.from(searchParams.entries()).filter(
    ([k, v]) => k.startsWith('filter_') && !isFilterParamEmpty(v),
  );
  if (urlNonEmpty.length !== required.length) return false;
  return required.every((f) => {
    const raw = searchParams.get(`filter_${f.id}`);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw) as {
        operation?: string;
        value?: unknown;
      };
      if (parsed.operation !== f.operation) return false;
      if (f.value === undefined) return true;
      // JSON.stringify works as a deep-equality check for the flat shapes
      // we store (primitives + flat arrays). Don't extend without thinking.
      return JSON.stringify(parsed.value) === JSON.stringify(f.value);
    } catch {
      return false;
    }
  });
}

function classifyInvocationsUrl(
  path: string,
  pathname: string,
  searchParams: URLSearchParams,
): InvocationsUrlKind {
  const detail = pathname.match(new RegExp(`^${path}/([^/]+)`));
  if (detail?.[1]) return { kind: 'detail', id: detail[1] };
  if (pathname !== path) return null;
  if (urlMatchesShortcut(searchParams, ALL_INVOCATIONS_SHORTCUT)) {
    return { kind: 'all' };
  }
  const preset = INVOCATION_SHORTCUTS.find((s) =>
    urlMatchesShortcut(searchParams, s),
  );
  if (preset) return { kind: 'preset', id: preset.id };
  return { kind: 'custom' };
}

/**
 * True when the URL is the All view or matches a named preset. The
 * /invocations route uses this to decide whether to remember the URL as
 * a "Custom query" entry in the sidebar.
 */
export function matchesAnyInvocationPreset(
  searchParams: URLSearchParams,
): boolean {
  if (urlMatchesShortcut(searchParams, ALL_INVOCATIONS_SHORTCUT)) return true;
  return INVOCATION_SHORTCUTS.some((s) => urlMatchesShortcut(searchParams, s));
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

interface InvocationsSidebarItemProps {
  baseUrl?: string;
  disabled?: boolean;
  preserveSearchParams?: boolean | string[];
}

function useRecentItem(): InvocationsRecent | null {
  const [item, setItem] = useState<InvocationsRecent | null>(() =>
    getInvocationsRecent(),
  );
  useEffect(
    () => subscribeInvocationsRecent(() => setItem(getInvocationsRecent())),
    [],
  );
  return item;
}

function truncateId(id: string): string {
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}…${id.slice(-5)}`;
}

export function InvocationsSidebarItem({
  baseUrl = '',
  disabled,
  preserveSearchParams = false,
}: InvocationsSidebarItemProps) {
  const path = `${baseUrl}/invocations`;
  const recent = useRecentItem();
  const location = useLocation();
  const current = classifyInvocationsUrl(
    path,
    location.pathname,
    new URLSearchParams(location.search),
  );

  // Sub-item match functions all derive from the same classifier — the
  // active preset (if any) wins exactly one highlight.
  const classify = (loc: SidebarLocation) =>
    classifyInvocationsUrl(path, loc.pathname, loc.searchParams);

  const subItems: SidebarSubItem[] = [
    {
      href: shortcutHref(path, ALL_INVOCATIONS_SHORTCUT),
      label: 'All',
      match: (loc) => classify(loc)?.kind === 'all',
      preserveSearchParams,
    },
    ...INVOCATION_SHORTCUTS.map((s) => ({
      href: shortcutHref(path, s),
      label: s.label,
      match: ((loc) => {
        const k = classify(loc);
        return k?.kind === 'preset' && k.id === s.id;
      }) satisfies SidebarMatch,
      preserveSearchParams,
    })),
  ];

  // The 5th slot (rendered between the fixed rail and the More dropdown)
  // shows at most one item. Current URL beats memory:
  // - on a detail page → that invocation id (active)
  // - on a custom-filter /invocations URL → "Custom query" (active)
  // - on an overflow preset (Idempotent, Most retried, …) → preset label (active)
  // - otherwise fall back to the last remembered detail/custom (not active)
  // Fixed rail presets (All, In-flight, Stuck) don't appear here — they
  // already have their own row in the rail.
  const FIXED_PRESET_IDS = new Set(['inflight', 'stuck']);

  const extraSubItems: SidebarSubItem[] = [];
  if (current?.kind === 'detail') {
    const id = current.id;
    extraSubItems.push({
      href: `${path}/${id}`,
      label: (
        <span className="min-w-0 flex-auto truncate font-mono">
          {truncateId(id)}
        </span>
      ),
      match: (loc) => loc.pathname === `${path}/${id}`,
      preserveSearchParams: false,
    });
  } else if (current?.kind === 'custom') {
    const value = location.search.replace(/^\?/, '');
    extraSubItems.push({
      href: `${path}?${value}`,
      label: 'Custom query',
      match: (loc) => classify(loc)?.kind === 'custom',
      preserveSearchParams: false,
    });
  } else if (current?.kind === 'preset' && !FIXED_PRESET_IDS.has(current.id)) {
    const preset = INVOCATION_SHORTCUTS.find((s) => s.id === current.id);
    if (preset) {
      const presetId = preset.id;
      extraSubItems.push({
        href: shortcutHref(path, preset),
        label: preset.label,
        match: (loc) => {
          const k = classify(loc);
          return k?.kind === 'preset' && k.id === presetId;
        },
        preserveSearchParams,
      });
    }
  } else if (recent?.type === 'invocation') {
    const id = recent.value;
    extraSubItems.push({
      href: `${path}/${id}`,
      label: (
        <span className="min-w-0 flex-auto truncate font-mono">
          {truncateId(id)}
        </span>
      ),
      match: (loc) => loc.pathname === `${path}/${id}`,
      preserveSearchParams: false,
    });
  } else if (recent?.type === 'custom') {
    extraSubItems.push({
      href: `${path}?${recent.value}`,
      label: 'Custom query',
      match: (loc) => classify(loc)?.kind === 'custom',
      preserveSearchParams: false,
    });
  }

  return (
    <SidebarNavItem
      href={shortcutHref(path, ALL_INVOCATIONS_SHORTCUT)}
      icon={IconName.Invocation}
      label="Invocations"
      preserveSearchParams={preserveSearchParams}
      disabled={disabled}
      subItems={subItems}
      extraSubItems={extraSubItems}
      visibleSubCount={3}
    />
  );
}
