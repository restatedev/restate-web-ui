import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router';
import {
  useCachedInvocationStatusDetails,
  useWarmInvocationStatusDetails,
  type useGetInvocationsJournalWithInvocationsV2,
} from '@restate/data-access-admin-api-hooks';
import { formatNumber } from '@restate/util-intl';
import {
  addChildProblems,
  filterJournalRows,
  findJournalProblems,
  getChildIdsToCheck,
  getProblemRowKey,
  getProblemTone,
  getRetriedCommands,
  getRetryKey,
  insertRetryRows,
  SHOW_PARAM,
  SHOW_PROBLEMS,
  type ChildStatuses,
  type PastRetries,
  type ProblemKind,
  type ProblemTone,
} from './problemRows';
import type { CombinedJournalEntry } from './useProcessedJournal';

const CHILD_CHECK_LIMIT = 1_000;
const CHILD_CHECK_INTERVAL_MS = 60_000;
const NO_STATUSES: ChildStatuses = {};
const NO_RETRIES = new Map<string, PastRetries>();
const NO_PROBLEMS = {
  kindByRow: new Map<number, ProblemKind>(),
  rowIndexes: [] as number[],
};

type JournalData = ReturnType<
  typeof useGetInvocationsJournalWithInvocationsV2
>['data'];

function haveSameIds(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function useJournalProblems({
  enabled,
  invocationId,
  data,
  rows,
  showErrors,
}: {
  enabled: boolean;
  invocationId: string;
  data: JournalData;
  rows: CombinedJournalEntry[];
  showErrors: boolean;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isProblemsOnly =
    enabled && searchParams.get(SHOW_PARAM) === SHOW_PROBLEMS;

  const { data: visibleStatuses } =
    useCachedInvocationStatusDetails(invocationId);
  const [checkedStatuses, setCheckedStatuses] = useState<ChildStatuses>();
  const childStatuses = useMemo(
    () =>
      checkedStatuses || visibleStatuses?.invocations
        ? { ...checkedStatuses, ...visibleStatuses?.invocations }
        : NO_STATUSES,
    [checkedStatuses, visibleStatuses],
  );

  const completedInvocationIds = useMemo(
    () =>
      new Set(
        Object.entries(data).flatMap(([id, value]) =>
          value?.completed_at ? [id] : [],
        ),
      ),
    [data],
  );
  const retriedCommands = useMemo(
    () =>
      enabled
        ? getRetriedCommands(
            Object.fromEntries(
              Object.entries(data).map(([id, value]) => [
                id,
                value?.journal?.entries,
              ]),
            ),
          )
        : NO_RETRIES,
    [enabled, data],
  );
  const journalProblems = useMemo(
    () =>
      enabled
        ? findJournalProblems(rows, retriedCommands, completedInvocationIds)
        : undefined,
    [enabled, rows, retriedCommands, completedInvocationIds],
  );
  const problems = useMemo(
    () =>
      journalProblems
        ? addChildProblems(
            journalProblems,
            rows,
            retriedCommands,
            childStatuses,
            completedInvocationIds,
          )
        : NO_PROBLEMS,
    [
      journalProblems,
      rows,
      retriedCommands,
      childStatuses,
      completedInvocationIds,
    ],
  );

  const [checkLimit, setCheckLimit] = useState(CHILD_CHECK_LIMIT);
  const childIdsToCheck = useMemo(
    () =>
      isProblemsOnly && journalProblems
        ? getChildIdsToCheck(rows, journalProblems.childRowIndexes)
        : [],
    [isProblemsOnly, rows, journalProblems],
  );
  const wantedCheckIds = useMemo(
    () => childIdsToCheck.slice(0, checkLimit),
    [childIdsToCheck, checkLimit],
  );
  const [checkIds, setCheckIds] = useState<string[]>([]);
  const checkIdsUpdatedAt = useRef(0);
  useEffect(() => {
    if (!isProblemsOnly || haveSameIds(checkIds, wantedCheckIds)) {
      return;
    }
    const update = () => {
      checkIdsUpdatedAt.current = Date.now();
      setCheckIds(wantedCheckIds);
    };
    const wait =
      checkIdsUpdatedAt.current + CHILD_CHECK_INTERVAL_MS - Date.now();
    if (checkIds.length === 0 || wait <= 0) {
      update();
      return;
    }
    const timer = setTimeout(update, wait);
    return () => clearTimeout(timer);
  }, [isProblemsOnly, wantedCheckIds, checkIds]);
  const checkAllChildren = useCallback(() => {
    checkIdsUpdatedAt.current = 0;
    setCheckLimit(Infinity);
  }, []);

  const [findText, setFindText] = useState('');
  const query = useDeferredValue(findText.trim().toLowerCase());
  const filtered = useMemo(
    () =>
      isProblemsOnly || query
        ? filterJournalRows(
            rows,
            { problemsOnly: isProblemsOnly, query },
            problems.kindByRow,
          )
        : undefined,
    [isProblemsOnly, query, rows, problems],
  );
  const filteredRows = filtered?.rows ?? rows;

  const [expandedRetries, setExpandedRetries] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const isRetryRowExpanded = useCallback(
    (key: string) => expandedRetries.has(key),
    [expandedRetries],
  );
  const toggleRetryRow = useCallback((row: CombinedJournalEntry) => {
    const key = getRetryKey(row);
    if (!key) {
      return;
    }
    setExpandedRetries((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);
  const entries = useMemo(
    () =>
      enabled && !showErrors && expandedRetries.size > 0
        ? insertRetryRows(filteredRows, retriedCommands, isRetryRowExpanded)
        : filteredRows,
    [
      enabled,
      showErrors,
      expandedRetries.size,
      filteredRows,
      retriedCommands,
      isRetryRowExpanded,
    ],
  );

  const [activeProblemKey, setActiveProblemKey] = useState<string>();
  const [announcement, setAnnouncement] = useState('');
  const setProblemsOnly = useCallback(
    (problemsOnly: boolean) => {
      if (problemsOnly === isProblemsOnly) {
        return;
      }
      setActiveProblemKey(undefined);
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (problemsOnly) {
            next.set(SHOW_PARAM, SHOW_PROBLEMS);
          } else {
            next.delete(SHOW_PARAM);
          }
          return next;
        },
        { replace: true },
      );
    },
    [isProblemsOnly, setSearchParams],
  );

  const problemTones = useMemo(() => {
    if (!enabled) {
      return undefined;
    }
    const tones = new Map<string, ProblemTone>();
    problems.kindByRow.forEach((kind, index) => {
      const row = rows[index];
      const key = getProblemRowKey(row);
      if (key) {
        tones.set(key, getProblemTone(kind, row, childStatuses));
      }
    });
    return tones;
  }, [enabled, problems, rows, childStatuses]);

  const navigableRows = useMemo(() => {
    if (entries === rows) {
      return problems.rowIndexes;
    }
    const keys = new Set(
      problems.rowIndexes.map((index) => getProblemRowKey(rows[index])),
    );
    return entries.flatMap((row, index) =>
      keys.has(getProblemRowKey(row)) ? [index] : [],
    );
  }, [problems, entries, rows]);
  const activeProblemIndex = useMemo(
    () =>
      activeProblemKey
        ? entries.findIndex((row) => getProblemRowKey(row) === activeProblemKey)
        : -1,
    [activeProblemKey, entries],
  );
  const activeProblemPosition =
    activeProblemIndex >= 0 ? navigableRows.indexOf(activeProblemIndex) : -1;
  const selectProblem = useCallback(
    (index: number) => {
      setActiveProblemKey(getProblemRowKey(entries[index]));
      setAnnouncement(
        `Problem ${formatNumber(navigableRows.indexOf(index) + 1)} of ${formatNumber(navigableRows.length)}`,
      );
    },
    [entries, navigableRows],
  );

  return {
    entries,
    problemTotal: problems.rowIndexes.length,
    problemTones,
    pastRetries: enabled && !showErrors ? retriedCommands : undefined,
    isRetryRowExpanded,
    toggleRetryRow,
    isProblemsOnly,
    setProblemsOnly,
    findText,
    setFindText,
    matchCount: filtered?.matches,
    navigableRows,
    activeProblemIndex,
    activeProblemPosition,
    selectProblem,
    announcement,
    childCheck: {
      invocationIds: isProblemsOnly ? checkIds : [],
      onStatuses: setCheckedStatuses,
      checked: wantedCheckIds.length,
      total: childIdsToCheck.length,
      checkAll: checkAllChildren,
    },
  };
}

export const ProblemChildCheck = memo(function ProblemChildCheck({
  invocationIds,
  referenceInvocationId,
  onStatuses,
}: {
  invocationIds: string[];
  referenceInvocationId: string;
  onStatuses: (statuses: ChildStatuses) => void;
}) {
  const { data } = useWarmInvocationStatusDetails(
    invocationIds,
    referenceInvocationId,
    {
      enabled: invocationIds.length > 0,
      refetchOnMount: true,
      staleTime: 0,
      refetchOnWindowFocus: false,
      refetchInterval: false,
    },
  );
  useEffect(() => {
    if (data?.invocations) {
      onStatuses(data.invocations);
    }
  }, [data, onStatuses]);
  return null;
});
