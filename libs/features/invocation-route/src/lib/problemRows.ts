import type {
  components,
  JournalEntryV2,
} from '@restate/data-access-admin-api-spec';
import { isTargetInvocationEntry } from '@restate/features-invocation-ui';
import type { CombinedJournalEntry } from './useProcessedJournal';

export const SHOW_PARAM = 'show';
export const SHOW_PROBLEMS = 'problems';

export type ProblemKind = 'failed' | 'retried' | 'children' | 'waiting';

type ChildStatuses = Record<
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
      if (
        entry.type === 'Event: TransientError' &&
        'relatedCommandIndex' in entry &&
        typeof entry.relatedCommandIndex === 'number'
      ) {
        const key = `${invocationId}:${entry.relatedCommandIndex}`;
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

export function getChildInvocationIds(rows: CombinedJournalEntry[]) {
  const ids = new Set<string>();
  for (const { entry } of rows) {
    if (
      entry?.category === 'command' &&
      isTargetInvocationEntry(entry) &&
      entry.invocationId
    ) {
      ids.add(entry.invocationId);
    }
  }
  return [...ids];
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
    return canWait && entry.isAwaitingOn ? 'waiting' : undefined;
  }
  if (entry.isRetrying) {
    return 'retried';
  }
  if (entry.resultType === 'failure') {
    return 'failed';
  }
  const childStatus =
    isTargetInvocationEntry(entry) && entry.invocationId
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
  if (canWait && (entry.isPending || entry.isAwaitingOn)) {
    return 'waiting';
  }
  return undefined;
}

export function findProblems(
  rows: CombinedJournalEntry[],
  retried: ReadonlyMap<string, PastRetries>,
  childStatuses: ChildStatuses,
  completedInvocationIds: ReadonlySet<string>,
) {
  const kindByRow = new Map<number, ProblemKind>();
  const rowIndexes: number[] = [];
  rows.forEach((row, index) => {
    const kind = getRowProblem(
      row,
      retried,
      childStatuses,
      completedInvocationIds,
    );
    if (!kind) {
      return;
    }
    kindByRow.set(index, kind);
    if (row.depth === 0) {
      rowIndexes.push(index);
    }
  });
  return { kindByRow, rowIndexes };
}

export function getProblemChildIds(
  rows: CombinedJournalEntry[],
  rowIndexes: number[],
  childStatuses: ChildStatuses,
) {
  return rowIndexes.flatMap((index) => {
    const entry = rows[index]?.entry;
    return isTargetInvocationEntry(entry) &&
      entry.invocationId &&
      CHILD_PROBLEM_STATUSES.has(
        String(childStatuses[entry.invocationId]?.status),
      )
      ? [entry.invocationId]
      : [];
  });
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
      })
    | undefined;
  if (!entry) {
    return '';
  }
  return [
    entry.type,
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
    firstCommandIndex === -1 ? rows.length : firstCommandIndex;
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
      isTopShown = !problemsOnly || kindByRow.has(index);
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
  for (const row of rows) {
    out.push(row);
    const key = getRetryKey(row);
    const retries = key ? retried.get(key) : undefined;
    if (!key || !retries || !shouldExpand(key)) {
      continue;
    }
    for (const event of retries.events) {
      out.push({
        invocationId: row.invocationId,
        entry: event,
        depth: row.depth,
        parentCommand: row.entry,
        parentInvocationId: row.parentInvocationId,
      });
    }
  }
  return out;
}
