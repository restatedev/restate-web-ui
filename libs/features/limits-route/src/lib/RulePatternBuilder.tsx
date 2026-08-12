import { Badge } from '@restate/ui/badge';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { ListBox, ListBoxItem } from '@restate/ui/listbox';
import { PopoverOverlay } from '@restate/ui/popover';
import { tv } from '@restate/util/styles';
import { type ReactNode, useMemo, useState } from 'react';
import {
  ComboBox as AriaComboBox,
  Group,
  Input as AriaInput,
} from 'react-aria-components';
import {
  getRuleLevel,
  parseConcreteKey,
  patternMatchesKey,
  type PatternFields,
} from './pattern';
import { RULE_LEVEL_META, RuleLevelBadge } from './RuleLevel';

const fillStyles = tv({
  slots: {
    wrap: '-ml-1 flex-1 filter-[drop-shadow(-1px_0px_0px_var(--color-zinc-300))]',
    level1:
      'h-full flex-1 [clip-path:polygon(0_0,100%_0,calc(100%-4px)_100%,0_100%)]',
    level2: 'h-full w-full [clip-path:polygon(4px_0,100%_0,100%_100%,0%_100%)]',
  },
  variants: {
    level1Disabled: {
      true: { level1: 'bg-zinc-50' },
      false: { level1: 'bg-white' },
    },
    level2Disabled: {
      true: { level2: 'bg-zinc-100' },
      false: { level2: 'bg-white' },
    },
  },
});

const segmentStyles = tv({
  slots: {
    root: 'relative flex h-full min-w-0 flex-1 items-center',
    input:
      'h-full w-full min-w-0 border-0 bg-transparent pr-2 pl-2.5 text-left font-mono text-xs text-gray-700 outline-none placeholder:font-sans placeholder:text-gray-400 focus:ring-0 disabled:text-gray-300 disabled:placeholder:text-gray-300',
  },
  variants: {
    wildcard: {
      true: { input: 'font-semibold text-blue-600' },
    },
  },
});

const labelStyles = tv({
  base: 'flex min-w-0 flex-col gap-0.5 text-xs font-medium text-gray-700',
});

const fieldGroupStyles = tv({
  base: 'relative flex h-10 min-w-0 items-stretch rounded-xl border border-gray-200 bg-white shadow-xs transition focus-within:border-gray-200 focus-within:shadow-none focus-within:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] focus-within:outline-2 focus-within:outline-blue-600',
});

const ANY = '__restate_any_value__';
const UNSET = '__restate_unset_value__';

function fromOption(value: string) {
  if (value === ANY) return '*';
  if (value === UNSET) return '';
  return value;
}

function AsteriskGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 6v12M17.196 9 6.804 15M6.804 9l10.392 6" />
    </svg>
  );
}

function MinusGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 12h10" />
    </svg>
  );
}

function PatternSegment({
  label,
  value,
  onChange,
  placeholder,
  icon,
  allowUnset,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon?: ReactNode;
  allowUnset?: boolean;
  disabled?: boolean;
}) {
  const { root, input } = segmentStyles({ wildcard: value.trim() === '*' });
  return (
    <AriaComboBox
      aria-label={label}
      inputValue={value}
      onInputChange={(nextValue) => onChange(fromOption(nextValue))}
      onSelectionChange={(key) => {
        if (key != null) onChange(fromOption(String(key)));
      }}
      allowsCustomValue
      menuTrigger="focus"
      isDisabled={disabled}
      defaultFilter={() => true}
      className={root()}
    >
      {icon && (
        <span className="flex shrink-0 items-center pl-3 text-gray-400">
          {icon}
        </span>
      )}
      <Group className="relative flex h-full min-w-0 flex-1 items-center">
        <AriaInput
          className={input()}
          placeholder={placeholder}
          spellCheck={false}
        />
      </Group>
      <PopoverOverlay className="w-(--trigger-width) min-w-36 bg-gray-100/90">
        <ListBox className="max-h-[inherit] overflow-auto border-none p-1 outline-0">
          <ListBoxItem value={ANY}>
            <AsteriskGlyph className="h-3.5 w-3.5 shrink-0" />
            Any value
          </ListBoxItem>
          {allowUnset && (
            <ListBoxItem value={UNSET}>
              <MinusGlyph className="h-3.5 w-3.5 shrink-0" />
              Not set
            </ListBoxItem>
          )}
        </ListBox>
      </PopoverOverlay>
    </AriaComboBox>
  );
}

export function RulePatternBuilder({
  fields,
  onChange,
  disabled,
}: {
  fields: PatternFields;
  onChange: (fields: PatternFields) => void;
  disabled?: boolean;
}) {
  const scopeEmpty = !fields.scope.trim();
  const level1Empty = !fields.level1.trim();
  const level1Disabled = disabled || scopeEmpty;
  const level2Disabled = disabled || scopeEmpty || level1Empty;
  const fill = fillStyles({ level1Disabled, level2Disabled });
  const update = (patch: Partial<PatternFields>) => {
    const next = { ...fields, ...patch };
    if (!next.scope.trim()) {
      next.level1 = '';
      next.level2 = '';
    } else if (!next.level1.trim()) {
      next.level2 = '';
    }
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2">
        <span className={labelStyles()}>
          <span>Scope</span>
          <span className="text-2xs font-normal text-gray-400">
            Top-level limit counter · required
          </span>
        </span>
        <div className="grid min-w-0 grid-cols-2">
          <span className={labelStyles()}>
            <span>Level 1</span>
            <span className="text-2xs font-normal text-gray-400">
              First limit-key value
            </span>
          </span>
          <span className={labelStyles()}>
            <span>Level 2</span>
            <span className="text-2xs font-normal text-gray-400">
              Second limit-key value
            </span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2">
        <div className={fieldGroupStyles()}>
          <PatternSegment
            label="Scope"
            value={fields.scope}
            onChange={(scope) => update({ scope })}
            placeholder="scope or *"
            disabled={disabled}
          />
        </div>
        <div className={fieldGroupStyles()}>
          <div className="pointer-events-none absolute inset-0 flex items-stretch overflow-hidden rounded-[inherit]">
            <div className={fill.level1()} />
            <div className={fill.wrap()}>
              <div className={fill.level2()} />
            </div>
          </div>
          <div className="relative z-10 flex min-w-0 flex-1 items-stretch">
            <PatternSegment
              label="Limit key level 1"
              value={fields.level1}
              onChange={(level1) => update({ level1 })}
              placeholder={scopeEmpty ? 'Add Scope first' : 'Add Level 1'}
              allowUnset
              disabled={level1Disabled}
            />
            <PatternSegment
              label="Limit key level 2"
              value={fields.level2}
              onChange={(level2) => update({ level2 })}
              placeholder={
                scopeEmpty
                  ? 'Add Scope first'
                  : level1Empty
                    ? 'Add Level 1 first'
                    : 'Add Level 2'
              }
              allowUnset
              disabled={level2Disabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const SAMPLE_VALUES = [
  'eu',
  'us',
  'acme',
  'web',
  'prod',
  'team',
  'api',
  'beta',
  'orders',
];

function generateExamples(pattern: string) {
  const parts = pattern.split('/');
  if (!pattern || parts.length > 3 || parts.some((part) => !part)) {
    return { matching: [], notMatching: [] };
  }
  let cursor = 0;
  const token = () => SAMPLE_VALUES[cursor++ % SAMPLE_VALUES.length] ?? 'x';
  const concrete = parts.map((part) => (part === '*' ? token() : part));
  const candidates: string[] = [concrete.join('/')];

  for (let variant = 0; variant < 3; variant += 1) {
    candidates.push(
      parts
        .map((part, index) => (part === '*' ? token() : concrete[index]))
        .join('/'),
    );
  }
  if (parts.length < 3) candidates.push([...concrete, token()].join('/'));
  if (parts.length < 2) {
    candidates.push([...concrete, token(), token()].join('/'));
  }
  candidates.push([`other-${token()}`, ...concrete.slice(1)].join('/'));
  if (concrete.length > 1) candidates.push(concrete.slice(0, -1).join('/'));
  parts.forEach((part, index) => {
    if (index > 0 && part !== '*') {
      const candidate = [...concrete];
      candidate[index] = `other-${token()}`;
      candidates.push(candidate.join('/'));
    }
  });

  const matching: string[] = [];
  const notMatching: string[] = [];
  for (const candidate of new Set(candidates)) {
    const key = parseConcreteKey(candidate);
    if (!key) continue;
    (patternMatchesKey(pattern, key) ? matching : notMatching).push(candidate);
  }
  return {
    matching: matching.slice(0, 5),
    notMatching: notMatching.slice(0, 5),
  };
}

const keyPillStyles = tv({
  base: 'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-2xs transition',
  variants: {
    tone: {
      match:
        'border-green-600/20 bg-green-50 text-green-700 hover:bg-green-100',
      no: 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
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
    <Button
      type="button"
      variant="secondary"
      onClick={onClick}
      className={keyPillStyles({ tone })}
    >
      <Icon
        name={tone === 'match' ? IconName.Check : IconName.Cancel}
        className="h-3 w-3 shrink-0"
      />
      {value}
    </Button>
  );
}

const previewBodyStyles = tv({
  base: 'relative flex flex-col gap-2.5 transition-all',
  variants: {
    open: {
      true: '',
      false:
        'max-h-12 overflow-hidden mask-[linear-gradient(to_top,transparent_0,black_90%)] opacity-70',
    },
  },
});

export function RuleMatchPreview({ pattern }: { pattern: string }) {
  const [test, setTest] = useState('');
  const [isOpen, setOpen] = useState(false);
  const examples = useMemo(() => generateExamples(pattern), [pattern]);
  const key = useMemo(() => parseConcreteKey(test), [test]);
  const result = pattern && key ? patternMatchesKey(pattern, key) : null;
  const level = getRuleLevel(pattern);
  const levelLabel = RULE_LEVEL_META[level].label;
  const hasExamples =
    examples.matching.length > 0 || examples.notMatching.length > 0;

  return (
    <div className="rounded-xl border border-sky-300/30 bg-sky-50/40 p-2.5 text-sky-800 transition-all">
      <div className="mb-2.5 flex items-center gap-1.5 px-0.5 font-sans text-sm">
        <Icon name={IconName.Eye} className="h-4 w-4" />
        Preview
        {pattern && <RuleLevelBadge level={level} />}
        <span className="ml-auto text-0.5xs font-normal text-sky-600/80">
          {pattern
            ? `Test which keys are governed at ${levelLabel}`
            : 'Complete Scope to test a key'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex min-w-0 flex-1 items-center">
          <span className="pointer-events-none absolute left-2.5 text-2xs font-medium text-sky-500/90">
            Test
          </span>
          <input
            type="text"
            value={test}
            onChange={(event) => setTest(event.target.value)}
            placeholder={
              pattern ? 'a key — scope/l1/l2' : 'Complete Scope first'
            }
            aria-label="Test a key against this rule"
            spellCheck={false}
            disabled={!pattern}
            className="h-8 w-full rounded-lg border border-sky-200 bg-white pr-2.5 pl-11 font-mono text-xs text-gray-700 shadow-xs transition outline-none placeholder:font-sans placeholder:text-gray-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-white/50 disabled:text-gray-400 disabled:shadow-none"
          />
        </div>
        {test.trim() &&
          (key === null ? (
            <Badge size="sm" className="shrink-0 text-gray-400">
              invalid key
            </Badge>
          ) : result ? (
            <Badge size="sm" variant="success" className="shrink-0 gap-1">
              <Icon name={IconName.Check} className="h-3 w-3" />
              applies at {levelLabel}
            </Badge>
          ) : (
            <Badge size="sm" className="shrink-0 gap-1 text-gray-500">
              <Icon name={IconName.Cancel} className="h-3 w-3" />
              no match
            </Badge>
          ))}
      </div>

      {hasExamples && (
        <div className="relative">
          <div className={previewBodyStyles({ open: isOpen })}>
            <div className="mt-2.5 border-t border-sky-300/25 pt-2.5" />
            {examples.matching.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-20 shrink-0 text-2xs font-medium text-sky-700/80">
                  Applies
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
                <span className="w-20 shrink-0 text-2xs font-medium text-sky-700/80">
                  Doesn't apply
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
          </div>
          {!isOpen && (
            <Button
              variant="icon"
              type="button"
              className="mt-1 flex w-full items-center justify-center gap-1 text-0.5xs text-sky-600"
              onClick={() => setOpen(true)}
            >
              <Icon name={IconName.ChevronDown} className="h-4 w-4" />
              Show examples
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
