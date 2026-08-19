import {
  activeTransientQueryParams,
  PANEL_QUERY_PARAM,
  stripTransientSearch,
} from '@restate/util/panel';
import {
  QUERY_DEFINITIONS,
  type QueryDefinition,
  type QueryId,
} from './queryDefinitions';

export type QueryOutcome = 'success' | 'timeout' | 'error' | 'aborted';

// Where a query was started from: `key` is the normalized page plus open
// surfaces (stable, low-cardinality — what executions aggregate under), and
// `href` is a concrete example URL for that key so the UI can link to it.
export interface QueryPageRef {
  key: string;
  href: string;
}

export interface QueryMaxExecution {
  sql: string;
  durationMs: number;
  executedAt: number;
  page?: string;
  pageHref?: string;
  timedOut: boolean;
}

export interface QueryPageStat {
  page: string;
  count: number;
  href?: string;
}

export interface QueryStat {
  id: QueryId;
  description: string;
  shape: string;
  tables: readonly string[];
  deprecated?: boolean;
  count: number;
  p50: number | null;
  p90: number | null;
  max: QueryMaxExecution | null;
  timeouts: number;
  errors: number;
  aborted: number;
  lastExecutedAt: number;
  pages: QueryPageStat[];
}

export interface QueryExecutionEvent {
  id: QueryId;
  sql: string;
  durationMs: number;
  outcome: QueryOutcome;
  executedAt: number;
  page?: QueryPageRef;
}

interface PageEntry {
  count: number;
  href?: string;
}

interface QueryStatEntry {
  samples: number[];
  sampleCursor: number;
  count: number;
  timeouts: number;
  errors: number;
  aborted: number;
  max: QueryMaxExecution | null;
  lastExecutedAt: number;
  pages: Map<string, PageEntry>;
}

// Percentiles are computed over the most recent samples only; count and max
// cover the whole recorded history.
const MAX_SAMPLES = 1000;
const MAX_PAGES = 15;
const OVERFLOW_PAGE = 'other';

// Stats are persisted to localStorage so they survive reloads and can be
// merged across tabs. Each tab writes only its own bucket (keyed by a per-tab
// id kept in sessionStorage), which avoids write races; reads merge every
// non-expired bucket. Buckets untouched for a day are dropped.
const STORAGE_PREFIX = 'restate.query-stats.v1.';
const TAB_ID_KEY = 'restate.query-stats.tab-id';
const BUCKET_TTL_MS = 24 * 60 * 60 * 1000;
const PERSIST_DELAY_MS = 2000;

interface PersistedBucket {
  updatedAt: number;
  entries: [
    QueryId,
    Omit<QueryStatEntry, 'pages'> & {
      pages: [string, PageEntry][];
    },
  ][];
}

const entries = new Map<QueryId, QueryStatEntry>();
const listeners = new Set<() => void>();
const EMPTY_SNAPSHOT: QueryStat[] = [];
let snapshot: QueryStat[] | null = null;
let persistTimer: ReturnType<typeof setTimeout> | undefined;
let foreignEntriesCache: Map<QueryId, QueryStatEntry> | null = null;

function storageArea(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function tabBucketKey(): string | undefined {
  try {
    if (typeof sessionStorage === 'undefined') {
      return undefined;
    }
    let tabId = sessionStorage.getItem(TAB_ID_KEY);
    if (!tabId) {
      tabId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(TAB_ID_KEY, tabId);
    }
    return `${STORAGE_PREFIX}${tabId}`;
  } catch {
    return undefined;
  }
}

function serializeEntries(
  source: Map<QueryId, QueryStatEntry>,
): PersistedBucket {
  return {
    updatedAt: Date.now(),
    entries: Array.from(source.entries(), ([id, entry]) => [
      id,
      { ...entry, pages: [...entry.pages.entries()] },
    ]),
  };
}

function parseBucket(raw: string | null): Map<QueryId, QueryStatEntry> | null {
  if (!raw) {
    return null;
  }
  try {
    const bucket = JSON.parse(raw) as PersistedBucket;
    if (
      !bucket ||
      !Array.isArray(bucket.entries) ||
      Date.now() - bucket.updatedAt > BUCKET_TTL_MS
    ) {
      return null;
    }
    const parsed = new Map<QueryId, QueryStatEntry>();
    for (const [id, entry] of bucket.entries) {
      if (!(id in QUERY_DEFINITIONS)) {
        continue;
      }
      parsed.set(id, { ...entry, pages: new Map(entry.pages) });
    }
    return parsed;
  } catch {
    return null;
  }
}

export function flushQueryStats() {
  clearTimeout(persistTimer);
  persistTimer = undefined;
  const storage = storageArea();
  const bucketKey = tabBucketKey();
  if (!storage || !bucketKey) {
    return;
  }
  try {
    storage.setItem(bucketKey, JSON.stringify(serializeEntries(entries)));
    for (const key of foreignBucketKeys(storage, bucketKey)) {
      if (!parseBucket(storage.getItem(key))) {
        storage.removeItem(key);
      }
    }
  } catch {
    // Quota or privacy-mode failures must never break recording.
  }
}

function schedulePersist() {
  if (persistTimer !== undefined || !storageArea()) {
    return;
  }
  persistTimer = setTimeout(flushQueryStats, PERSIST_DELAY_MS);
}

function foreignBucketKeys(storage: Storage, ownKey: string): string[] {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key && key.startsWith(STORAGE_PREFIX) && key !== ownKey) {
      keys.push(key);
    }
  }
  return keys;
}

function foreignEntries(): Map<QueryId, QueryStatEntry> {
  if (foreignEntriesCache) {
    return foreignEntriesCache;
  }
  const merged = new Map<QueryId, QueryStatEntry>();
  const storage = storageArea();
  const bucketKey = tabBucketKey();
  if (storage && bucketKey) {
    for (const key of foreignBucketKeys(storage, bucketKey)) {
      const bucket = parseBucket(storage.getItem(key));
      bucket?.forEach((entry, id) => {
        const target = merged.get(id);
        if (target) {
          mergeEntryInto(target, entry);
        } else {
          merged.set(id, {
            ...entry,
            samples: [...entry.samples],
            pages: new Map(entry.pages),
          });
        }
      });
    }
  }
  foreignEntriesCache = merged;
  return merged;
}

function hydrateOwnBucket() {
  const storage = storageArea();
  const bucketKey = tabBucketKey();
  if (!storage || !bucketKey) {
    return;
  }
  const bucket = parseBucket(storage.getItem(bucketKey));
  bucket?.forEach((entry, id) => entries.set(id, entry));
}

hydrateOwnBucket();
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushQueryStats);
  // Another tab persisted its bucket: re-merge on the next snapshot read.
  window.addEventListener('storage', (event) => {
    if (event.key === null || event.key.startsWith(STORAGE_PREFIX)) {
      foreignEntriesCache = null;
      notify();
    }
  });
}

function createEntry(): QueryStatEntry {
  return {
    samples: [],
    sampleCursor: 0,
    count: 0,
    timeouts: 0,
    errors: 0,
    aborted: 0,
    max: null,
    lastExecutedAt: 0,
    pages: new Map(),
  };
}

function addSample(entry: QueryStatEntry, durationMs: number) {
  if (entry.samples.length < MAX_SAMPLES) {
    entry.samples.push(durationMs);
  } else {
    entry.samples[entry.sampleCursor] = durationMs;
    entry.sampleCursor = (entry.sampleCursor + 1) % MAX_SAMPLES;
  }
}

function addPage(
  entry: QueryStatEntry,
  page: string,
  href: string | undefined,
  count = 1,
) {
  const key =
    entry.pages.has(page) || entry.pages.size < MAX_PAGES
      ? page
      : OVERFLOW_PAGE;
  const existing = entry.pages.get(key);
  entry.pages.set(key, {
    count: (existing?.count ?? 0) + count,
    href: key === page ? (href ?? existing?.href) : existing?.href,
  });
}

function mergeEntryInto(target: QueryStatEntry, source: QueryStatEntry) {
  target.count += source.count;
  target.timeouts += source.timeouts;
  target.errors += source.errors;
  target.aborted += source.aborted;
  target.lastExecutedAt = Math.max(
    target.lastExecutedAt,
    source.lastExecutedAt,
  );
  if (
    source.max &&
    (!target.max || source.max.durationMs > target.max.durationMs)
  ) {
    target.max = source.max;
  }
  for (const sample of source.samples) {
    if (target.samples.length >= MAX_SAMPLES) {
      break;
    }
    target.samples.push(sample);
  }
  source.pages.forEach((page, key) =>
    addPage(target, key, page.href, page.count),
  );
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) {
    return null;
  }
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index] ?? null;
}

function notify() {
  snapshot = null;
  listeners.forEach((listener) => listener());
}

// Page attribution must be captured when the query starts, not when it
// finishes; slow queries often outlive a navigation. The href drops transient
// (dialog) params so following it later does not reopen the dialog.
export function getCurrentQueryPage(): QueryPageRef | undefined {
  if (typeof window === 'undefined' || !window.location) {
    return undefined;
  }
  const { pathname, search } = window.location;
  return {
    key: describeQueryPage(pathname, search),
    href: `${pathname}${stripTransientSearch(search)}`,
  };
}

const ANONYMOUS_DIALOG_SURFACE = 'dialog';

// Modal dialogs currently on screen. The shared DialogContent stamps
// `data-dialog-surface` (named via its `surface` prop) on the dialog element,
// and React Aria keeps modal content in the DOM only while the overlay is
// open — so presence of the attribute is the open state, with no lifecycle
// tracking needed.
function openDialogSurfacesFromDom(): string[] {
  if (typeof document === 'undefined') {
    return [];
  }
  return Array.from(
    document.querySelectorAll('[data-dialog-surface]'),
    (element) =>
      element.getAttribute('data-dialog-surface') || ANONYMOUS_DIALOG_SURFACE,
  );
}

// The page plus the surfaces open when the query started: the active panel
// (?panel=<name>), URL-driven dialogs (their registered transient params), and
// mounted modal dialogs (named via DialogContent's `surface`, else a plain
// `dialog` marker). Surfaces mean "open at query start", not proven causation —
// background polling keeps running behind dialogs and panels.
export function describeQueryPage(
  pathname: string,
  search: string,
  dialogSurfaces: string[] = openDialogSurfacesFromDom(),
): string {
  const page = normalizeQueryPage(pathname);
  const surfaces: string[] = [];
  const searchParams = new URLSearchParams(search);
  const panel = searchParams.get(PANEL_QUERY_PARAM);
  if (panel) {
    surfaces.push(`panel:${panel}`);
  }
  const dialogs = new Set(activeTransientQueryParams(searchParams));
  let hasAnonymousDialog = false;
  for (const name of dialogSurfaces) {
    if (name === ANONYMOUS_DIALOG_SURFACE) {
      hasAnonymousDialog = true;
    } else {
      dialogs.add(name);
    }
  }
  surfaces.push(...[...dialogs].sort().map((name) => `dialog:${name}`));
  if (dialogs.size === 0 && hasAnonymousDialog) {
    surfaces.push(ANONYMOUS_DIALOG_SURFACE);
  }
  return surfaces.length > 0 ? `${page} · ${surfaces.join(' · ')}` : page;
}

// Collapses id-shaped path segments (invocation ids, VQueue/workflow ids,
// cloud environment tokens) so a query's page set stays bounded.
export function normalizeQueryPage(pathname: string): string {
  const normalized = pathname
    .split('/')
    .map((segment) => {
      if (!segment) {
        return segment;
      }
      let decoded = segment;
      try {
        decoded = decodeURIComponent(segment);
      } catch {
        // Keep the raw segment if it is not valid percent-encoding.
      }
      if (decoded.startsWith('inv_') || decoded.length > 24) {
        return ':id';
      }
      return decoded;
    })
    .join('/');
  return normalized || '/';
}

export function recordQuery(event: QueryExecutionEvent) {
  try {
    let entry = entries.get(event.id);
    if (!entry) {
      entry = createEntry();
      entries.set(event.id, entry);
    }
    entry.count += 1;
    entry.lastExecutedAt = event.executedAt;
    addPage(entry, event.page?.key ?? 'unknown', event.page?.href);
    switch (event.outcome) {
      case 'aborted':
        // Aborted durations are censored by navigation, not the query; keep
        // them out of the duration stats.
        entry.aborted += 1;
        break;
      case 'error':
        entry.errors += 1;
        break;
      case 'timeout':
      case 'success': {
        const durationMs = Math.round(event.durationMs * 10) / 10;
        if (event.outcome === 'timeout') {
          entry.timeouts += 1;
        }
        addSample(entry, durationMs);
        if (!entry.max || durationMs > entry.max.durationMs) {
          entry.max = {
            sql: event.sql,
            durationMs,
            executedAt: event.executedAt,
            page: event.page?.key,
            pageHref: event.page?.href,
            timedOut: event.outcome === 'timeout',
          };
        }
        break;
      }
    }
    schedulePersist();
    notify();
  } catch {
    // Recording is instrumentation; it must never break the query itself.
  }
}

export function subscribeToQueryStats(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getQueryStatsSnapshot(): QueryStat[] {
  if (!snapshot) {
    const merged = new Map<QueryId, QueryStatEntry>();
    const addAll = (source: Map<QueryId, QueryStatEntry>) =>
      source.forEach((entry, id) => {
        const target = merged.get(id);
        if (target) {
          mergeEntryInto(target, entry);
        } else {
          merged.set(id, {
            ...entry,
            samples: [...entry.samples],
            pages: new Map(entry.pages),
          });
        }
      });
    addAll(entries);
    addAll(foreignEntries());

    snapshot =
      merged.size === 0
        ? EMPTY_SNAPSHOT
        : Array.from(merged.entries(), ([id, entry]) => {
            const definition: QueryDefinition = QUERY_DEFINITIONS[id];
            const sorted = [...entry.samples].sort((a, b) => a - b);
            return {
              id,
              description: definition.description,
              shape: definition.shape,
              tables: definition.tables,
              ...(definition.deprecated ? { deprecated: true } : {}),
              count: entry.count,
              p50: percentile(sorted, 50),
              p90: percentile(sorted, 90),
              max: entry.max,
              timeouts: entry.timeouts,
              errors: entry.errors,
              aborted: entry.aborted,
              lastExecutedAt: entry.lastExecutedAt,
              pages: Array.from(entry.pages.entries(), ([page, value]) => ({
                page,
                count: value.count,
                ...(value.href ? { href: value.href } : {}),
              })).sort((a, b) => b.count - a.count),
            };
          });
  }
  return snapshot;
}

export function clearQueryStats() {
  entries.clear();
  foreignEntriesCache = null;
  const storage = storageArea();
  if (storage) {
    try {
      const keys: string[] = [];
      for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keys.push(key);
        }
      }
      keys.forEach((key) => storage.removeItem(key));
    } catch {
      // Clearing storage is best-effort.
    }
  }
  notify();
}
