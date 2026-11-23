import { INVOCATION_STATUS_DEFINITIONS } from '@restate/data-access-admin-api-spec';

const STATUS_LABELS = new Map<string, string>(
  INVOCATION_STATUS_DEFINITIONS.map(({ key, label }) => [key, label]),
);

const STAGE_NAMES: Record<string, string> = {
  inbox: 'Inbox',
  finished: 'Completed',
};

const FAILED_STATUSES = ['failed', 'cancelled', 'killed'];

function includedStatuses(raw: string) {
  const { operation, value } = JSON.parse(raw) as {
    operation?: string;
    value?: unknown;
  };
  if (!Array.isArray(value) || value.length === 0) return [];
  const values = new Set(value as string[]);
  return INVOCATION_STATUS_DEFINITIONS.filter(({ key }) =>
    operation === 'NOT_IN' ? !values.has(key) : values.has(key),
  );
}

function hasExactly(included: ReadonlyArray<{ key: string }>, keys: string[]) {
  return (
    included.length === keys.length &&
    included.every(({ key }) => keys.includes(key))
  );
}

export function describeStatusFilter(raw: string | null | undefined) {
  if (!raw) return undefined;
  try {
    const included = includedStatuses(raw);
    if (included.length === 0) return undefined;
    for (const [stage, name] of Object.entries(STAGE_NAMES)) {
      const stageKeys = INVOCATION_STATUS_DEFINITIONS.filter(
        (definition) => definition.stage === stage,
      ).map(({ key }) => key);
      if (hasExactly(included, stageKeys)) return name;
    }
    const notFinished = INVOCATION_STATUS_DEFINITIONS.filter(
      ({ stage }) => stage !== 'finished',
    ).map(({ key }) => key);
    if (hasExactly(included, notFinished)) return 'Not completed';
    if (hasExactly(included, FAILED_STATUSES)) return 'Failed';
    if (included.length <= 2) {
      return included
        .map(({ key }) => STATUS_LABELS.get(key) ?? key)
        .join(', ');
    }
    return `${included.length} statuses`;
  } catch {
    return undefined;
  }
}
