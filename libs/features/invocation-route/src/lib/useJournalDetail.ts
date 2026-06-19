import { useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import type { DropdownMenuSelection } from '@restate/ui/dropdown';

// The detailed journal view is no longer all-or-nothing: each of these
// categories can be toggled independently. Most map 1:1 onto the rows that
// `shouldIncludeEntry` (useProcessedJournal) hides in compact mode; `size` is
// the exception — it adds no rows, it toggles the approximate byte-size badge
// shown on each payload button. `hidden` reveals entries the handler author
// marked hidden-by-default via metadata, and is only offered when at least one
// loaded handler defines such entries (see `availableCategories`).
export const DETAIL_QUERY_PARAM = 'detail';

export const DETAIL_CATEGORIES = [
  'errors',
  'completions',
  'lifecycle',
  'hidden',
  'size',
] as const;
export type DetailCategory = (typeof DETAIL_CATEGORIES)[number];

export const DETAIL_CATEGORY_LABELS: Record<DetailCategory, string> = {
  errors: 'Transient errors',
  completions: 'Completions',
  lifecycle: 'Lifecycle history',
  hidden: 'Hidden entries',
  size: 'Payload sizes',
};

export const DETAIL_CATEGORY_DESCRIPTIONS: Record<DetailCategory, string> = {
  errors:
    'Failures from retried attempts; if later attempts hit the same error, only the first is shown',
  completions:
    'The notification sent when an action completes, whether it succeeded or failed',
  lifecycle: 'Past suspensions and pauses',
  hidden:
    'Entries the service/handler marked hidden by default in the metadata',
  size: 'Approximate byte size shown next to each payload',
};

export type JournalDetail = Record<DetailCategory, boolean>;

// Used as the "compact" value for the embedded `withTimeline={false}` previews
// and as the journal context default. Frozen so its identity stays stable.
export const COMPACT_DETAIL: JournalDetail = Object.freeze({
  errors: false,
  completions: false,
  lifecycle: false,
  hidden: false,
  size: false,
});

// Reads/writes the detailed-view selection from repeated `?detail=` query
// params (e.g. `?detail=errors&detail=completions`) so it survives reloads and
// is shareable, matching the invocations column picker. No params == compact;
// unknown values are ignored. Categories are written in canonical order so
// links are stable regardless of click order. Memoized on `searchParams`
// (stable until `location.search` changes) so the live-poll re-renders don't
// churn `useProcessedJournal`.
export function useJournalDetail({
  hasHiddenEntries = false,
}: { hasHiddenEntries?: boolean } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const detail = useMemo<JournalDetail>(() => {
    const selected = new Set(searchParams.getAll(DETAIL_QUERY_PARAM));
    return {
      errors: selected.has('errors'),
      completions: selected.has('completions'),
      lifecycle: selected.has('lifecycle'),
      hidden: selected.has('hidden'),
      size: selected.has('size'),
    };
  }, [searchParams]);

  // `hidden` is only meaningful when a loaded handler actually defines
  // hidden-by-default entries; otherwise it's dropped so the toggle never
  // offers a category that can't do anything. The rest are always available.
  const availableCategories = useMemo(
    () =>
      DETAIL_CATEGORIES.filter(
        (category) => category !== 'hidden' || hasHiddenEntries,
      ),
    [hasHiddenEntries],
  );

  const selectedCategories = useMemo(
    () => availableCategories.filter((category) => detail[category]),
    [detail, availableCategories],
  );

  const isCompact = selectedCategories.length === 0;

  // Remembers the last non-empty selection for this page visit so toggling
  // Compact ⇄ Detailed is lossless. Updated only from event handlers (React's
  // ref guidance — never during render): `writeCategories` records every
  // non-empty write, and `setCompact` captures what's on screen right before
  // it clears the URL, so even a selection that came straight from a shared
  // `?detail=…` link is restored after a round-trip. Compact still clears
  // `?detail`, so the URL and the menu honestly show the empty state. Resets
  // when navigating to another invocation (JournalV2 remounts); defaults to
  // all categories until something has been shown.
  const lastSelectionRef = useRef<DetailCategory[]>([...DETAIL_CATEGORIES]);

  const writeCategories = useCallback(
    (categories: Iterable<DetailCategory>) => {
      const next = new Set(categories);
      const ordered = availableCategories.filter((category) =>
        next.has(category),
      );
      if (ordered.length > 0) {
        lastSelectionRef.current = ordered;
      }
      setSearchParams((old) => {
        old.delete(DETAIL_QUERY_PARAM);
        ordered.forEach((category) => old.append(DETAIL_QUERY_PARAM, category));
        return old;
      });
    },
    [setSearchParams, availableCategories],
  );

  const setCompact = useCallback(() => {
    // Capture what's on screen before collapsing so Detailed can restore it.
    if (selectedCategories.length > 0) {
      lastSelectionRef.current = selectedCategories;
    }
    writeCategories([]);
  }, [selectedCategories, writeCategories]);
  const setDetailed = useCallback(
    () => writeCategories(lastSelectionRef.current),
    [writeCategories],
  );
  const setSelection = useCallback(
    (selection: DropdownMenuSelection) => {
      if (selection === 'all') {
        writeCategories(availableCategories);
      } else {
        writeCategories(
          Array.from(selection, (key) => String(key) as DetailCategory),
        );
      }
    },
    [writeCategories, availableCategories],
  );

  return {
    detail,
    availableCategories,
    selectedCategories,
    isCompact,
    setCompact,
    setDetailed,
    setSelection,
  };
}
