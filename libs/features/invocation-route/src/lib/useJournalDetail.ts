import { useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import type { DropdownMenuSelection } from '@restate/ui/dropdown';

// The detailed journal view is no longer all-or-nothing: each of these
// categories can be toggled independently. Most map 1:1 onto the rows that
// `shouldIncludeEntry` (useProcessedJournal) hides in compact mode; `size` is
// the exception — it adds no rows, it toggles the approximate byte-size badge
// shown on each payload button.
export const DETAIL_QUERY_PARAM = 'detail';

export const DETAIL_CATEGORIES = [
  'errors',
  'completions',
  'lifecycle',
  'size',
] as const;
export type DetailCategory = (typeof DETAIL_CATEGORIES)[number];

export const DETAIL_CATEGORY_LABELS: Record<DetailCategory, string> = {
  errors: 'Transient errors',
  completions: 'Completions',
  lifecycle: 'Lifecycle history',
  size: 'Payload sizes',
};

export const DETAIL_CATEGORY_DESCRIPTIONS: Record<DetailCategory, string> = {
  errors:
    'Failures from retried attempts; if later attempts hit the same error, only the first is shown',
  completions:
    'The notification sent when an action completes, whether it succeeded or failed',
  lifecycle: 'Past suspensions and pauses',
  size: 'Approximate byte size shown next to each payload',
};

export type JournalDetail = Record<DetailCategory, boolean>;

// Used as the "compact" value for the embedded `withTimeline={false}` previews
// and as the journal context default. Frozen so its identity stays stable.
export const COMPACT_DETAIL: JournalDetail = Object.freeze({
  errors: false,
  completions: false,
  lifecycle: false,
  size: false,
});

// Reads/writes the detailed-view selection from repeated `?detail=` query
// params (e.g. `?detail=errors&detail=completions`) so it survives reloads and
// is shareable, matching the invocations column picker. No params == compact;
// unknown values are ignored. Categories are written in canonical order so
// links are stable regardless of click order. Memoized on `searchParams`
// (stable until `location.search` changes) so the live-poll re-renders don't
// churn `useProcessedJournal`.
export function useJournalDetail() {
  const [searchParams, setSearchParams] = useSearchParams();

  const detail = useMemo<JournalDetail>(() => {
    const selected = new Set(searchParams.getAll(DETAIL_QUERY_PARAM));
    return {
      errors: selected.has('errors'),
      completions: selected.has('completions'),
      lifecycle: selected.has('lifecycle'),
      size: selected.has('size'),
    };
  }, [searchParams]);

  const selectedCategories = useMemo(
    () => DETAIL_CATEGORIES.filter((category) => detail[category]),
    [detail],
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
      const ordered = DETAIL_CATEGORIES.filter((category) =>
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
    [setSearchParams],
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
        writeCategories(DETAIL_CATEGORIES);
      } else {
        writeCategories(
          Array.from(selection, (key) => String(key) as DetailCategory),
        );
      }
    },
    [writeCategories],
  );

  return {
    detail,
    selectedCategories,
    isCompact,
    setCompact,
    setDetailed,
    setSelection,
  };
}
