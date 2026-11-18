import type {
  components,
  JournalEntryV2,
} from '@restate/data-access-admin-api-spec';
import { isTargetInvocationEntry } from '@restate/features-invocation-ui';
import type { CombinedJournalEntry } from './useProcessedJournal';

export const SHOW_PARAM = 'show';
export const SHOW_PROBLEMS = 'problems';

export type ProblemKind = 'failed' | 'retried' | 'children' | 'waiting';

export type ChildStatuses = Record<
  string,
  components['schemas']['InvocationStatusResult'] | undefined
>;

const FAILED_CHILD_STATUSES = new Set(['failed', 'killed', 'cancelled']);
const CHILD_PROBLEM_STATUSES = new Set([
  'failed',
  'killed',
  'cancelled',
  'backing-off',
  'paused',
]);

export function isChildProblemStatus(status?: string) {
  return status !== undefined && CHILD_PROBLEM_STATUSES.has(status);
}

export interface PastRetries {
  count: number;
  lastMessage?: string;
  events: JournalEntryV2[];
}

export function getRetriedCommands(
  entriesByInvocation: Record<string, JournalEntryV2[] | undefined>,
) {
  const retried = new Map<string, PastRetries>();
  for (const [invocationId, entries] of Object.entries(entriesByInvocation)) {
    for (const entry of entries ?? []) {
      if (entry.type === 'Event: TransientError') {
        const key =
          'relatedCommandIndex' in entry &&
          typeof entry.relatedCommandIndex === 'number'
            ? `${invocationId}:${entry.relatedCommandIndex}`
            : getInvocationRetryKey(invocationId);
        const message =
          'message' in entry && typeof entry.message === 'string'
            ? entry.message
            : entry.error?.message;
        const previous = retried.get(key);
        if (previous) {
          previous.count += 1;
          previous.lastMessage = message ?? previous.lastMessage;
          previous.events.push(entry);
        } else {
          retried.set(key, { count: 1, lastMessage: message, events: [entry] });
        }
      }
    }
  }
  return retried;
}

export function getInvocationRetryKey(invocationId: string) {
  return `${invocationId}:invocation`;
}

export function getPastRetries(
  row: CombinedJournalEntry,
  retried: ReadonlyMap<string, PastRetries>,
) {
  const { entry } = row;
  return entry?.category === 'command' &&
    !entry.isRetrying &&
    !entry.isPending &&
    typeof entry.commandIndex === 'number'
    ? retried.get(`${row.invocationId}:${entry.commandIndex}`)
    : undefined;
}

export function getRowProblem(
  row: CombinedJournalEntry,
  retried: ReadonlyMap<string, PastRetries>,
  childStatuses: ChildStatuses,
  completedInvocationIds: ReadonlySet<string>,
): ProblemKind | undefined {
  const { entry } = row;
  if (!entry || entry.type === 'Input') {
    return undefined;
  }
  const canWait = !completedInvocationIds.has(row.invocationId);
  if (entry.category !== 'command') {
    return canWait && entry.isAwaitingOn && entry.isPending
      ? 'waiting'
      : undefined;
  }
  if (entry.isRetrying) {
    return 'retried';
  }
  if (entry.resultType === 'failure') {
    return 'failed';
  }
  const childStatus =
    isTargetInvocationEntry(entry) &&
    entry.invocationId &&
    (entry.type === 'OneWayCall' || entry.isPending)
      ? childStatuses[entry.invocationId]?.status
      : undefined;
  if (childStatus && CHILD_PROBLEM_STATUSES.has(childStatus)) {
    return 'children';
  }
  if (
    typeof entry.commandIndex === 'number' &&
    retried.has(`${row.invocationId}:${entry.commandIndex}`)
  ) {
    return 'retried';
  }
  if (canWait && entry.isPending) {
    return 'waiting';
  }
  return undefined;
}

const NO_CHILD_STATUSES: ChildStatuses = {};

function inheritRetry(kind?: ProblemKind): ProblemKind {
  return kind === undefined || kind === 'waiting' ? 'retried' : kind;
}

function getCommandIndexes(entries: JournalEntryV2[] = []) {
  const indexes = new Set<number>();
  for (const entry of entries) {
    if (
      entry.category === 'command' &&
      entry.type !== 'Input' &&
      typeof entry.commandIndex === 'number'
    ) {
      indexes.add(entry.commandIndex);
    }
  }
  return indexes;
}

export function findJournalProblems(
  rows: CombinedJournalEntry[],
  retried: ReadonlyMap<string, PastRetries>,
  completedInvocationIds: ReadonlySet<string>,
  entriesByInvocation?: Record<string, JournalEntryV2[] | undefined>,
) {
  const kindByRow = new Map<number, ProblemKind>();
  const childRowIndexes: number[] = [];
  const matchedRetryKeys = new Set<string>();
  const rowByChildId = new Map<string, number>();
  rows.forEach((row, index) => {
    const { entry } = row;
    if (isTargetInvocationEntry(entry) && entry.invocationId) {
      childRowIndexes.push(index);
      rowByChildId.set(entry.invocationId, index);
    }
    if (retried.size > 0) {
      const key = getRetryKey(row);
      if (key && retried.has(key)) {
        matchedRetryKeys.add(key);
      }
    }
    const kind = getRowProblem(
      row,
      retried,
      NO_CHILD_STATUSES,
      completedInvocationIds,
    );
    if (kind) {
      kindByRow.set(index, kind);
    }
  });
  const inheritedRetryRows = new Set<number>();
  const unmatchedRetryInvocations = new Set<string>();
  const commandIndexesByInvocation = new Map<string, Set<number>>();
  for (const key of retried.keys()) {
    if (matchedRetryKeys.has(key)) {
      continue;
    }
    const separator = key.lastIndexOf(':');
    const invocationId = key.slice(0, separator);
    const commandIndex = Number(key.slice(separator + 1));
    if (entriesByInvocation && Number.isInteger(commandIndex)) {
      let commandIndexes = commandIndexesByInvocation.get(invocationId);
      if (!commandIndexes) {
        commandIndexes = getCommandIndexes(entriesByInvocation[invocationId]);
        commandIndexesByInvocation.set(invocationId, commandIndexes);
      }
      if (commandIndexes.has(commandIndex)) {
        continue;
      }
    }
    unmatchedRetryInvocations.add(invocationId);
    const index = rowByChildId.get(invocationId);
    if (index !== undefined) {
      inheritedRetryRows.add(index);
      kindByRow.set(index, inheritRetry(kindByRow.get(index)));
    }
  }
  return {
    kindByRow,
    childRowIndexes,
    inheritedRetryRows,
    unmatchedRetryInvocations,
  };
}

interface ChildProblems {
  kindByRow: Map<number, ProblemKind>;
  rowIndexes: number[];
  failedChildRows: Set<number>;
}

const NO_ROWS = new Set<number>();

const childProblemsByJournal = new WeakMap<
  ReturnType<typeof findJournalProblems>,
  { problems: ChildProblems; statuses: ChildStatuses }
>();

function getCountedRowIndexes(kindByRow: Map<number, ProblemKind>) {
  return [...kindByRow]
    .flatMap(([index, kind]) => (kind === 'waiting' ? [] : [index]))
    .sort((a, b) => a - b);
}

export function addChildProblems(
  journalProblems: ReturnType<typeof findJournalProblems>,
  rows: CombinedJournalEntry[],
  retried: ReadonlyMap<string, PastRetries>,
  childStatuses: ChildStatuses,
  completedInvocationIds: ReadonlySet<string>,
): ChildProblems {
  const previous = childProblemsByJournal.get(journalProblems);
  const indexes = previous
    ? journalProblems.childRowIndexes.filter((index) => {
        const entry = rows[index]?.entry;
        const id = isTargetInvocationEntry(entry)
          ? entry.invocationId
          : undefined;
        return id !== undefined && previous.statuses[id] !== childStatuses[id];
      })
    : journalProblems.childRowIndexes;
  const base = previous?.problems.kindByRow ?? journalProblems.kindByRow;
  const baseFailed = previous?.problems.failedChildRows ?? NO_ROWS;
  let kindByRow: Map<number, ProblemKind> | undefined;
  let failedChildRows: Set<number> | undefined;
  for (const index of indexes) {
    const row = rows[index];
    const ownKind = row
      ? getRowProblem(row, retried, childStatuses, completedInvocationIds)
      : undefined;
    const kind = journalProblems.inheritedRetryRows.has(index)
      ? inheritRetry(ownKind)
      : ownKind;
    if (base.get(index) !== kind) {
      kindByRow ??= new Map(base);
      if (kind) {
        kindByRow.set(index, kind);
      } else {
        kindByRow.delete(index);
      }
    }
    const isFailed =
      kind === 'children' &&
      getProblemTone(kind, row, childStatuses) === 'danger';
    if (baseFailed.has(index) !== isFailed) {
      failedChildRows ??= new Set(baseFailed);
      if (isFailed) {
        failedChildRows.add(index);
      } else {
        failedChildRows.delete(index);
      }
    }
  }
  const problems =
    previous && !kindByRow && !failedChildRows
      ? previous.problems
      : {
          kindByRow: kindByRow ?? base,
          rowIndexes:
            kindByRow || !previous
              ? getCountedRowIndexes(kindByRow ?? base)
              : previous.problems.rowIndexes,
          failedChildRows: failedChildRows ?? baseFailed,
        };
  childProblemsByJournal.set(journalProblems, {
    problems,
    statuses: childStatuses,
  });
  return problems;
}

export function findProblems(
  rows: CombinedJournalEntry[],
  retried: ReadonlyMap<string, PastRetries>,
  childStatuses: ChildStatuses,
  completedInvocationIds: ReadonlySet<string>,
) {
  return addChildProblems(
    findJournalProblems(rows, retried, completedInvocationIds),
    rows,
    retried,
    childStatuses,
    completedInvocationIds,
  );
}

export function getChildIdsToCheck(
  rows: CombinedJournalEntry[],
  childRowIndexes: number[],
) {
  const ids = new Set<string>();
  for (const index of childRowIndexes) {
    const entry = rows[index]?.entry;
    if (
      isTargetInvocationEntry(entry) &&
      entry.invocationId &&
      (entry.type === 'OneWayCall' || entry.isPending)
    ) {
      ids.add(entry.invocationId);
    }
  }
  return [...ids];
}

export type ProblemTone = 'danger' | 'warning' | 'info';

export function getProblemTone(
  kind: ProblemKind,
  row: CombinedJournalEntry | undefined,
  childStatuses: ChildStatuses,
): ProblemTone {
  switch (kind) {
    case 'failed':
      return 'danger';
    case 'retried':
      return 'warning';
    case 'waiting':
      return 'info';
    case 'children': {
      const entry = row?.entry;
      return isTargetInvocationEntry(entry) &&
        entry.invocationId &&
        FAILED_CHILD_STATUSES.has(
          String(childStatuses[entry.invocationId]?.status),
        )
        ? 'danger'
        : 'warning';
    }
  }
}

const ROW_TYPE_LABELS: Record<string, string> = {
  OneWayCall: 'send',
  AttachInvocation: 'attach',
  CompleteAwakeable: 'awakeable',
  GetEagerState: 'get state',
  GetLazyState: 'get state',
  SetState: 'set state',
  ClearState: 'clear state',
  GetPromise: 'promise',
};

export function getProblemRowKey(row?: CombinedJournalEntry) {
  return row ? `${row.invocationId}:${row.entry?.index}` : undefined;
}

type EntryKind =
  | 'runs'
  | 'calls'
  | 'sends'
  | 'sleeps'
  | 'state'
  | 'awakeables'
  | 'promises'
  | 'signals'
  | 'attach'
  | 'events'
  | 'other';

const ENTRY_KIND_LABELS: Record<EntryKind, string> = {
  runs: 'Runs',
  calls: 'Calls',
  sends: 'Sends',
  sleeps: 'Sleeps',
  state: 'State',
  awakeables: 'Awakeables',
  promises: 'Promises',
  signals: 'Signals',
  attach: 'Attach',
  events: 'Lifecycle',
  other: 'Other',
};

const KIND_BY_TYPE: Record<string, EntryKind> = {
  Run: 'runs',
  Call: 'calls',
  CallInvocationId: 'calls',
  OneWayCall: 'sends',
  Sleep: 'sleeps',
  GetState: 'state',
  GetEagerState: 'state',
  GetLazyState: 'state',
  SetState: 'state',
  ClearState: 'state',
  ClearAllState: 'state',
  GetStateKeys: 'state',
  GetEagerStateKeys: 'state',
  GetLazyStateKeys: 'state',
  Awakeable: 'awakeables',
  CompleteAwakeable: 'awakeables',
  GetPromise: 'promises',
  PeekPromise: 'promises',
  CompletePromise: 'promises',
  SendSignal: 'signals',
  Signal: 'signals',
  AttachInvocation: 'attach',
  GetInvocationOutput: 'attach',
};

function getEntryKind(entry?: JournalEntryV2): EntryKind {
  if (!entry) {
    return 'other';
  }
  if (entry.category === 'event') {
    return 'events';
  }
  return KIND_BY_TYPE[String(entry.type)] ?? 'other';
}

const searchTextByEntry = new WeakMap<JournalEntryV2, string>();

function getRowSearchText(row: CombinedJournalEntry) {
  if (!row.entry) {
    return '';
  }
  let text = searchTextByEntry.get(row.entry);
  if (text === undefined) {
    text = buildSearchText(row);
    searchTextByEntry.set(row.entry, text);
  }
  return text;
}

function buildSearchText(row: CombinedJournalEntry) {
  const entry = row.entry as
    | (JournalEntryV2 & {
        serviceName?: string;
        handlerName?: string;
        serviceKey?: string;
        invocationId?: string;
        key?: string;
        promiseName?: string;
        signalName?: string;
      })
    | undefined;
  if (!entry) {
    return '';
  }
  return [
    entry.type,
    entry.key,
    entry.promiseName,
    entry.signalName,
    ROW_TYPE_LABELS[String(entry.type)],
    ENTRY_KIND_LABELS[getEntryKind(entry)],
    entry.name,
    entry.serviceName,
    entry.serviceKey,
    entry.handlerName,
    entry.invocationId,
    entry.error?.message,
    typeof entry.commandIndex === 'number'
      ? `#${entry.commandIndex}`
      : undefined,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export interface JournalRowFilter {
  problemsOnly: boolean;
  query: string;
}

export function filterJournalRows(
  rows: CombinedJournalEntry[],
  { problemsOnly, query }: JournalRowFilter,
  kindByRow: Map<number, ProblemKind>,
) {
  const groupHasProblems: boolean[] = [];
  let group = -1;
  rows.forEach((row, index) => {
    if (row.depth === 0) {
      group += 1;
    } else if (kindByRow.has(index)) {
      groupHasProblems[group] = true;
    }
  });
  const firstCommandIndex = rows.findIndex(
    (row) => row.depth === 0 && row.entry?.category === 'command',
  );
  const leadingRows =
    firstCommandIndex !== -1 ? firstCommandIndex : query ? 0 : rows.length;
  const keep = new Set<number>();
  for (let index = 0; index < leadingRows; index++) {
    keep.add(index);
  }
  const lastRowAtDepth: number[] = [];
  const keptCommands = new Set<string>();
  let matches = 0;
  let isTopShown = true;
  group = -1;
  rows.forEach((row, index) => {
    if (row.depth === 0) {
      group += 1;
      isTopShown =
        !problemsOnly ||
        kindByRow.has(index) ||
        Boolean(groupHasProblems[group]);
    }
    lastRowAtDepth[row.depth] = index;
    lastRowAtDepth.length = row.depth + 1;
    const isShown =
      row.depth === 0
        ? isTopShown
        : !problemsOnly ||
          (isTopShown && (kindByRow.has(index) || !groupHasProblems[group]));
    const parentKey =
      row.entry?.category !== 'command' &&
      typeof row.parentCommand?.commandIndex === 'number'
        ? `${row.invocationId}:${row.parentCommand.commandIndex}`
        : undefined;
    if (parentKey && keptCommands.has(parentKey)) {
      lastRowAtDepth.forEach((ancestor) => keep.add(ancestor));
      return;
    }
    if (isShown && (!query || getRowSearchText(row).includes(query))) {
      matches += 1;
      lastRowAtDepth.forEach((ancestor) => keep.add(ancestor));
      const key = getRetryKey(row);
      if (key) {
        keptCommands.add(key);
      }
    }
  });
  return { rows: rows.filter((_, index) => keep.has(index)), matches };
}

export function getRetryKey(row: CombinedJournalEntry) {
  const commandIndex = row.entry?.commandIndex;
  return row.entry?.category === 'command' && typeof commandIndex === 'number'
    ? `${row.invocationId}:${commandIndex}`
    : undefined;
}

export function insertRetryRows(
  rows: CombinedJournalEntry[],
  retried: ReadonlyMap<string, PastRetries>,
  shouldExpand: (key: string) => boolean,
) {
  if (retried.size === 0) {
    return rows;
  }
  const out: CombinedJournalEntry[] = [];
  const pending: { depth: number; rows: CombinedJournalEntry[] }[] = [];
  const flushUntil = (depth: number) => {
    while ((pending.at(-1)?.depth ?? -1) >= depth) {
      out.push(...(pending.pop()?.rows ?? []));
    }
  };
  for (const row of rows) {
    flushUntil(row.depth);
    out.push(row);
    const key = getRetryKey(row);
    const retries = key ? retried.get(key) : undefined;
    if (!key || !retries || !shouldExpand(key)) {
      continue;
    }
    pending.push({
      depth: row.depth,
      rows: retries.events.map((event) => ({
        invocationId: row.invocationId,
        entry: event,
        depth: row.depth,
        parentCommand: row.entry,
        parentInvocationId: row.parentInvocationId,
      })),
    });
  }
  flushUntil(0);
  return out;
}
