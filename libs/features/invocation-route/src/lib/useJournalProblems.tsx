import {
  memo,
  useCallback,
  useEffect,
  useDeferredValue,
  useMemo,
  useState,
} from 'react';
import { useSearchParams } from 'react-router';
import type { JournalEntryV2 } from '@restate/data-access-admin-api-spec';
import {
  useCachedInvocationStatusDetails,
  useInvocationStatusCheck,
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
  getPausedCommands,
  getProblemStats,
  getRecoveredRows,
  insertRetryRows,
  SHOW_PARAM,
  SHOW_PROBLEMS,
  isChildProblemStatus,
  type ChildStatuses,
  type PastRetries,
  type ProblemKind,
  type ProblemTone,
} from './problemRows';
import type { CombinedJournalEntry } from './useProcessedJournal';

export const INPUT_ROW = -1;
const CHILD_CHECK_BATCH = 1_000;
const CHILD_CHECK_MAX_PER_REFRESH = 2_000;
const CHILD_CHECK_AUTO_LIMIT = 50_000;
const CHILD_CHECK_BATCH_PAUSE_MS = 250;
const CHILD_CHECK_MIN_INTERVAL_MS = 10_000;
const CHILD_CHECK_MAX_INTERVAL_MS = 20_000;
const CHILD_CHECK_MS_PER_UNFINISHED = 0.5;
const NO_STATUSES: ChildStatuses = {};
const NO_RETRIES = new Map<string, PastRetries>();
const NO_PROBLEMS = {
  kindByRow: new Map<number, ProblemKind>(),
  rowIndexes: [] as number[],
  failedChildRows: new Set<number>(),
};

type JournalData = ReturnType<
  typeof useGetInvocationsJournalWithInvocationsV2
>['data'];

export function getChildCheckInterval(unfinished: number) {
  return Math.min(
    CHILD_CHECK_MAX_INTERVAL_MS,
    CHILD_CHECK_MIN_INTERVAL_MS + unfinished * CHILD_CHECK_MS_PER_UNFINISHED,
  );
}

export function useJournalProblems({
  enabled,
  invocationId,
  data,
  rows,
  inputEntry,
  showErrors,
}: {
  enabled: boolean;
  invocationId: string;
  data: JournalData;
  rows: CombinedJournalEntry[];
  inputEntry?: JournalEntryV2;
  showErrors: boolean;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isProblemsOnly =
    enabled && searchParams.get(SHOW_PARAM) === SHOW_PROBLEMS;

  const { data: cachedStatuses } =
    useCachedInvocationStatusDetails(invocationId);
  const childStatuses = cachedStatuses?.invocations ?? NO_STATUSES;

  const completedInvocationIds = useMemo(
    () =>
      new Set(
        Object.entries(data).flatMap(([id, value]) =>
          value?.completed_at ? [id] : [],
        ),
      ),
    [data],
  );
  const entriesByInvocation = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(data).map(([id, value]) => [
          id,
          value?.journal?.entries,
        ]),
      ),
    [data],
  );
  const retriedCommands = useMemo(
    () => (enabled ? getRetriedCommands(entriesByInvocation) : NO_RETRIES),
    [enabled, entriesByInvocation],
  );
  const pausedCommands = useMemo(
    () =>
      enabled
        ? getPausedCommands(
            entriesByInvocation,
            (id) => data[id]?.status === 'paused',
          )
        : undefined,
    [enabled, entriesByInvocation, data],
  );
  const journalProblems = useMemo(
    () =>
      enabled
        ? findJournalProblems(
            rows,
            retriedCommands,
            completedInvocationIds,
            entriesByInvocation,
            pausedCommands,
          )
        : undefined,
    [
      enabled,
      rows,
      retriedCommands,
      completedInvocationIds,
      entriesByInvocation,
      pausedCommands,
    ],
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

  const childIdsToCheck = useMemo(
    () =>
      journalProblems
        ? getChildIdsToCheck(rows, journalProblems.childRowIndexes)
        : [],
    [rows, journalProblems],
  );
  const [isFullCheck, setFullCheck] = useState(isProblemsOnly);
  const checkIds = useMemo(
    () =>
      isFullCheck
        ? childIdsToCheck
        : childIdsToCheck.slice(0, CHILD_CHECK_AUTO_LIMIT),
    [isFullCheck, childIdsToCheck],
  );
  const [checkProgress, setCheckProgress] = useState<{
    checked: number;
    total: number;
    isIncomplete: boolean;
  }>();
  const updateCheckProgress = useCallback(
    (checked: number, total: number, isIncomplete = false) =>
      setCheckProgress(
        checked < total ? { checked, total, isIncomplete } : undefined,
      ),
    [],
  );

  const [findText, setFindText] = useState('');
  const query = useDeferredValue(findText.trim().toLowerCase());
  const filtered = useMemo(
    () =>
      isProblemsOnly || query
        ? filterJournalRows(
            rows,
            {
              problemsOnly: isProblemsOnly,
              query,
              pastRetries: showErrors ? undefined : retriedCommands,
            },
            problems.kindByRow,
          )
        : undefined,
    [isProblemsOnly, query, rows, problems, showErrors, retriedCommands],
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
      if (problemsOnly) {
        setFullCheck(true);
      }
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

  const recoveredRows = useMemo(
    () =>
      getRecoveredRows(
        problems.kindByRow,
        rows,
        journalProblems?.inheritedRetryRows,
      ),
    [problems, rows, journalProblems],
  );

  const problemTones = useMemo(() => {
    if (!enabled) {
      return undefined;
    }
    const tones = new Map<string, ProblemTone>();
    problems.kindByRow.forEach((kind, index) => {
      const key = getProblemRowKey(rows[index]);
      if (key) {
        tones.set(
          key,
          kind === 'children'
            ? problems.failedChildRows.has(index)
              ? 'danger'
              : 'warning'
            : recoveredRows.has(index)
              ? 'neutral'
              : getProblemTone(kind, undefined, NO_STATUSES),
        );
      }
    });
    return tones;
  }, [enabled, problems, rows, recoveredRows]);

  const inputKey = `${invocationId}:input`;
  const hasInputProblem =
    enabled &&
    Boolean(
      inputEntry?.isRetrying ||
      journalProblems?.unmatchedRetryInvocations.has(invocationId),
    );
  const navigableRows = useMemo(() => {
    const keys = new Set(
      problems.rowIndexes.map((index) => getProblemRowKey(rows[index])),
    );
    const shown =
      entries === rows
        ? problems.rowIndexes
        : entries.flatMap((row, index) =>
            keys.has(getProblemRowKey(row)) ? [index] : [],
          );
    return hasInputProblem ? [INPUT_ROW, ...shown] : shown;
  }, [problems, entries, rows, hasInputProblem]);
  const isInputRecovered =
    hasInputProblem &&
    !inputEntry?.isRetrying &&
    !isChildProblemStatus(data[invocationId]?.status);
  const problemStats = useMemo(() => {
    const stats = getProblemStats(
      problems.kindByRow,
      rows,
      childStatuses,
      recoveredRows,
    );
    if (isInputRecovered) {
      stats.recovered += 1;
    } else if (inputEntry?.isRetrying) {
      stats.retrying += 1;
    } else if (hasInputProblem) {
      stats.stuckInputStatus = data[invocationId]?.status;
    }
    return stats;
  }, [
    problems,
    rows,
    childStatuses,
    recoveredRows,
    hasInputProblem,
    isInputRecovered,
    inputEntry,
    data,
    invocationId,
  ]);
  const isInputActive = hasInputProblem && activeProblemKey === inputKey;
  const activeProblemIndex = useMemo(
    () =>
      activeProblemKey && activeProblemKey !== inputKey
        ? entries.findIndex((row) => getProblemRowKey(row) === activeProblemKey)
        : -1,
    [activeProblemKey, inputKey, entries],
  );
  const activeProblemPosition = isInputActive
    ? navigableRows.indexOf(INPUT_ROW)
    : activeProblemIndex >= 0
      ? navigableRows.indexOf(activeProblemIndex)
      : -1;
  const selectProblem = useCallback(
    (index: number) => {
      setActiveProblemKey(
        index === INPUT_ROW ? inputKey : getProblemRowKey(entries[index]),
      );
      setAnnouncement(
        `Problem ${formatNumber(navigableRows.indexOf(index) + 1)} of ${formatNumber(navigableRows.length)}`,
      );
    },
    [entries, navigableRows, inputKey],
  );
  const childCheck = useMemo(
    () => ({
      invocationIds: checkIds,
      onProgress: updateCheckProgress,
      progress: checkProgress,
      limit:
        checkIds.length < childIdsToCheck.length
          ? { checked: checkIds.length, total: childIdsToCheck.length }
          : undefined,
    }),
    [checkIds, childIdsToCheck, updateCheckProgress, checkProgress],
  );

  return {
    entries,
    problemTotal: problems.rowIndexes.length + (hasInputProblem ? 1 : 0),
    problemStats,
    inputTone: hasInputProblem
      ? isInputRecovered
        ? ('neutral' as const)
        : ('warning' as const)
      : undefined,
    isInputActive,
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
    childCheck,
  };
}

export const ProblemChildCheck = memo(function ProblemChildCheck({
  invocationIds,
  referenceInvocationId,
  isLive,
  isScrolling,
  onProgress,
}: {
  invocationIds: string[];
  referenceInvocationId: string;
  isLive: boolean;
  isScrolling: boolean;
  onProgress: (checked: number, total: number, isIncomplete?: boolean) => void;
}) {
  useInvocationStatusCheck(invocationIds, referenceInvocationId, {
    enabled: true,
    batchSize: CHILD_CHECK_BATCH,
    maxPerRefresh: CHILD_CHECK_MAX_PER_REFRESH,
    batchPauseMs: CHILD_CHECK_BATCH_PAUSE_MS,
    shouldShare: isChildProblemStatus,
    refetchInterval: (unfinished) =>
      isLive && !isScrolling && unfinished > 0
        ? getChildCheckInterval(unfinished)
        : false,
    onProgress,
  });
  useEffect(() => () => onProgress(0, 0), [onProgress]);
  return null;
});
