import { Badge } from '@restate/ui/badge';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import { useMemo, useState } from 'react';
import { PatternChip } from './PatternChip';
import {
  parseKey,
  parsePattern,
  patternComponents,
  rankPattern,
} from './patternMatching';

export interface PatternFields {
  scope: string;
  l1: string;
  l2: string;
}

export function splitPatternToFields(pattern: string): PatternFields {
  if (!pattern.trim()) {
    return { scope: '', l1: '', l2: '' };
  }
  const comps = patternComponents(pattern.trim());
  return { scope: comps[0] ?? '', l1: comps[1] ?? '', l2: comps[2] ?? '' };
}

// Build a pattern string from the three fields. L2 requires L1; an empty field
// means "not set" (and is dropped). Components: "*" = wildcard, else exact.
export function buildPattern({ scope, l1, l2 }: PatternFields): string {
  const s = scope.trim();
  if (!s) {
    return '';
  }
  const a = l1.trim();
  if (!a) {
    return s;
  }
  const b = l2.trim();
  return b ? `${s}/${a}/${b}` : `${s}/${a}`;
}

const fieldStyles = tv({
  slots: {
    input:
      'h-8 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-2.5 font-mono text-xs text-gray-700 shadow-xs outline-none transition placeholder:font-sans placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-300 disabled:shadow-none',
    wild: 'flex h-8 flex-1 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 font-mono text-xs text-blue-700',
    toggle:
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-base leading-none shadow-xs transition',
  },
  variants: {
    active: {
      true: { toggle: 'border-blue-300 bg-blue-50 text-blue-600' },
      false: {
        toggle:
          'border-gray-200 bg-white text-gray-400 hover:text-gray-600 disabled:opacity-40 disabled:hover:text-gray-400',
      },
    },
  },
});

function LevelField({
  label,
  hint,
  required,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const isWildcard = value.trim() === '*';
  const { input, wild, toggle } = fieldStyles({ active: isWildcard });
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label className="flex items-baseline gap-1.5 text-xs font-medium text-gray-600">
        {label}
        {required ? (
          <span className="text-2xs font-normal text-gray-400">required</span>
        ) : (
          <span className="text-2xs font-normal text-gray-400">{hint}</span>
        )}
      </label>
      <div className="flex items-center gap-1">
        {isWildcard ? (
          <span className={wild()}>
            <span className="text-sm">∗</span> any
          </span>
        ) : (
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={disabled ? '—' : required ? 'value' : 'Not set'}
            disabled={disabled}
            spellCheck={false}
            className={input()}
          />
        )}
        <button
          type="button"
          disabled={disabled}
          aria-pressed={isWildcard}
          aria-label={`${label}: match anything`}
          title="Match anything (∗)"
          onClick={() => onChange(isWildcard ? '' : '*')}
          className={toggle()}
        >
          ∗
        </button>
      </div>
    </div>
  );
}

export function PatternBuilder({
  fields,
  onChange,
  disabled,
}: {
  fields: PatternFields;
  onChange: (fields: PatternFields) => void;
  disabled?: boolean;
}) {
  const l1Empty = !fields.l1.trim();
  const update = (patch: Partial<PatternFields>) => {
    const next = { ...fields, ...patch };
    // L2 requires L1 — drop L2 if L1 becomes empty.
    if (!next.l1.trim()) {
      next.l2 = '';
    }
    onChange(next);
  };
  const pattern = buildPattern(fields);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-3 gap-2">
        <LevelField
          label="Scope"
          required
          value={fields.scope}
          onChange={(value) => update({ scope: value })}
          disabled={disabled}
        />
        <LevelField
          label="L1"
          hint="key level 1"
          value={fields.l1}
          onChange={(value) => update({ l1: value })}
          disabled={disabled}
        />
        <LevelField
          label="L2"
          hint={l1Empty ? 'set L1 first' : 'key level 2'}
          value={fields.l2}
          onChange={(value) => update({ l2: value })}
          disabled={disabled || l1Empty}
        />
      </div>
      <div className="flex min-h-6 items-center gap-2">
        <span className="text-2xs font-medium tracking-wide text-gray-400 uppercase">
          Pattern
        </span>
        {pattern ? (
          <PatternChip pattern={pattern} />
        ) : (
          <span className="text-xs text-gray-400 italic">
            Enter a scope to begin…
          </span>
        )}
      </div>
    </div>
  );
}

const SAMPLE_TOKENS = ['team', 'eu', 'acme', 'web', 'prod'];

// Generate illustrative keys around a pattern, classified by the real matcher so
// the would/would-not examples are guaranteed correct.
function generateExamples(patternStr: string): {
  matching: string[];
  notMatching: string[];
} {
  const parsed = parsePattern(patternStr);
  if (!parsed) {
    return { matching: [], notMatching: [] };
  }
  const comps = patternComponents(patternStr);
  let cursor = 0;
  const token = () => SAMPLE_TOKENS[cursor++ % SAMPLE_TOKENS.length] ?? 'x';
  const concrete = comps.map((comp) => (comp === '*' ? token() : comp));
  const candidates = new Set<string>();
  candidates.add(concrete.join('/'));
  if (parsed.level < 2) {
    candidates.add([...concrete, token()].join('/')); // deeper key still matches
  }
  candidates.add([`other-${token()}`, ...concrete.slice(1)].join('/')); // wrong scope
  if (concrete.length > 1) {
    candidates.add(concrete.slice(0, -1).join('/')); // too shallow
  }
  comps.forEach((comp, index) => {
    if (index > 0 && comp !== '*') {
      const swapped = [...concrete];
      swapped[index] = `other-${token()}`;
      candidates.add(swapped.join('/')); // wrong exact component
    }
  });
  if (parsed.level >= 1) {
    candidates.add(concrete[0] ?? ''); // scope-only key is too shallow
  }

  const matching: string[] = [];
  const notMatching: string[] = [];
  for (const candidate of candidates) {
    const key = parseKey(candidate);
    if (!key) {
      continue;
    }
    if (rankPattern(parsed, key) !== null) {
      matching.push(candidate);
    } else {
      notMatching.push(candidate);
    }
  }
  return { matching: matching.slice(0, 3), notMatching: notMatching.slice(0, 3) };
}

const keyPillStyles = tv({
  base: 'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-2xs',
  variants: {
    tone: {
      match: 'border-green-600/20 bg-green-50 text-green-700',
      no: 'border-gray-200 bg-white text-gray-500',
    },
  },
});

function KeyPill({
  value,
  tone,
  onClick,
}: {
  value: string;
  tone: 'match' | 'no';
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={keyPillStyles({ tone })}>
      <Icon
        name={tone === 'match' ? IconName.Check : IconName.Cancel}
        className="h-3 w-3 shrink-0"
      />
      {value}
    </button>
  );
}

export function MatchExamples({ pattern }: { pattern: string }) {
  const parsed = useMemo(() => parsePattern(pattern), [pattern]);
  const examples = useMemo(() => generateExamples(pattern), [pattern]);
  const [test, setTest] = useState('');
  const testKey = useMemo(() => (test.trim() ? parseKey(test) : null), [test]);
  const testResult = useMemo(() => {
    if (!parsed || !testKey) {
      return null;
    }
    return rankPattern(parsed, testKey) !== null;
  }, [parsed, testKey]);

  if (!parsed) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
      <span className="text-xs font-medium text-gray-600">
        What this matches
      </span>
      {examples.matching.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-20 shrink-0 text-2xs font-medium text-gray-400">
            Matches
          </span>
          {examples.matching.map((value) => (
            <KeyPill
              key={value}
              value={value}
              tone="match"
              onClick={() => setTest(value)}
            />
          ))}
        </div>
      )}
      {examples.notMatching.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-20 shrink-0 text-2xs font-medium text-gray-400">
            Doesn't match
          </span>
          {examples.notMatching.map((value) => (
            <KeyPill
              key={value}
              value={value}
              tone="no"
              onClick={() => setTest(value)}
            />
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 border-t border-gray-200 pt-2.5">
        <div className="relative flex min-w-0 flex-1 items-center">
          <span className="pointer-events-none absolute left-2.5 text-2xs font-medium text-gray-400">
            Test
          </span>
          <input
            type="text"
            value={test}
            onChange={(event) => setTest(event.target.value)}
            placeholder="a key — scope/l1/l2"
            aria-label="Test a key against this pattern"
            spellCheck={false}
            className="h-8 w-full rounded-lg border border-gray-200 bg-white pr-2.5 pl-11 font-mono text-xs text-gray-700 shadow-xs outline-none transition placeholder:font-sans placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        {test.trim() &&
          (testResult === null ? (
            <Badge size="sm" className="shrink-0 text-gray-400">
              invalid key
            </Badge>
          ) : testResult ? (
            <Badge size="sm" variant="success" className="shrink-0 gap-1">
              <Icon name={IconName.Check} className="h-3 w-3" />
              matches
            </Badge>
          ) : (
            <Badge size="sm" className="shrink-0 gap-1 text-gray-500">
              <Icon name={IconName.Cancel} className="h-3 w-3" />
              no match
            </Badge>
          ))}
      </div>
    </div>
  );
}
