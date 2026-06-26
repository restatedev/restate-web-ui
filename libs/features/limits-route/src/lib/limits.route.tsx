import {
  CreateLimitRuleRequest,
  LimitRule,
  LimitRuleStats,
  LimitRuleWithStats,
  UpdateLimitRuleRequest,
  UserLimitRow,
  useCreateLimitRule,
  useDeleteLimitRule,
  useGetLimitRuleWithLimits,
  useListLimitRules,
  useListUserLimits,
  useUpdateLimitRule,
} from '@restate/data-access/admin-api-hooks';
import { useFeatures } from '@restate/data-access/admin-api';
import { useRestateContext } from '@restate/features/restate-context';
import { Badge } from '@restate/ui/badge';
import { Button } from '@restate/ui/button';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui/content-panel';
import { Copy } from '@restate/ui/copy';
import {
  ConfirmationDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from '@restate/ui/dialog';
import { DropdownItem } from '@restate/ui/dropdown';
import { EmptyState } from '@restate/ui/empty-state';
import { ErrorBanner } from '@restate/ui/error';
import { FormFieldInput, Switch } from '@restate/ui/form-field';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { SplitButton } from '@restate/ui/split-button';
import { Cell, PanelTable, PanelTableColumn } from '@restate/ui/table';
import { HoverTooltip, TruncateWithTooltip } from '@restate/ui/tooltip';
import { formatDateTime, formatNumber } from '@restate/util/intl';
import { tv } from '@restate/util/styles';
import { useIsFeatureFlagEnabled } from '@restate/util/feature-flag';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Input as AriaInput,
  Label,
  SearchField,
  type SortDescriptor,
} from 'react-aria-components';
import { useNavigate, useSearchParams } from 'react-router';
import { PatternChip } from './PatternChip';
import {
  buildPattern,
  MatchExamples,
  PatternBuilder,
  splitPatternToFields,
  type PatternFields,
} from './PatternBuilder';
import {
  analyzeKey,
  parseKey,
  parsePattern,
  type KeyAnalysis,
  type ParsedPattern,
} from './patternMatching';

const LIMITS_FEATURE_FLAG = 'FEATURE_VQUEUE_OBSERVABILITY';
const DETAILS_TAB_QUERY = 'tab';

type RuleColumn =
  | 'pattern'
  | 'limit'
  | 'pending'
  | 'depth'
  | 'activeMatches'
  | 'description'
  | 'enabled'
  | 'actions';

type RuleSortColumn =
  | 'pattern'
  | 'limit'
  | 'pending'
  | 'depth'
  | 'activeMatches';

type WorstCounter = NonNullable<LimitRuleStats['worst_counter']>;

type CounterColumn =
  | 'scope'
  | 'l1'
  | 'l2'
  | 'level'
  | 'capacity'
  | 'num_waiters'
  | 'rule_pattern';

type PlaygroundColumn =
  | 'source'
  | 'scope'
  | 'l1'
  | 'l2'
  | 'level'
  | 'matches'
  | 'winning_rule';

interface RuleSummary {
  // Invocations pending for capacity across the rule's matches (SUM num_waiters).
  pending: number;
  // Live sys_user_limits rows resolving to this rule.
  matches: number;
  // Matches with at least one pending invocation (num_waiters > 0).
  backedUp: number;
  // Worst single match's num_waiters / concurrency_limit (depth x limit).
  depthRatio: number;
  // The deepest match (drives the Depth cell + its tooltip).
  worstCounter: WorstCounter | null;
}

type RuleRow = LimitRuleWithStats & {
  id: string;
  summary: RuleSummary;
};

type CounterRow = UserLimitRow & {
  id: string;
};

type PlaygroundRow = UserLimitRow & {
  id: string;
  source: 'live' | 'sample';
};

const RULE_COLUMNS: PanelTableColumn<RuleColumn>[] = [
  {
    id: 'pattern',
    name: 'Pattern',
    isRowHeader: true,
    allowsSorting: true,
    defaultWidth: 220,
    minWidth: 160,
  },
  {
    id: 'limit',
    name: 'Limit',
    allowsSorting: true,
    defaultWidth: 158,
    minWidth: 150,
  },
  {
    id: 'pending',
    name: 'Pending',
    allowsSorting: true,
    defaultWidth: 130,
    minWidth: 110,
  },
  {
    id: 'depth',
    name: (
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <span>Max depth</span>
        <span className="inline-flex items-center gap-0.5 text-0.5xs text-zinc-500">
          (x limit)
        </span>
      </span>
    ),
    allowsSorting: true,
    defaultWidth: 168,
    minWidth: 150,
  },
  {
    id: 'activeMatches',
    name: (
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <span>Active matches</span>
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-500">over capacity</span>
      </span>
    ),
    allowsSorting: true,
    defaultWidth: 260,
    minWidth: 230,
  },
  { id: 'description', name: 'Description', minWidth: 130 },
  { id: 'enabled', name: 'Enabled', width: 92 },
  { id: 'actions', name: 'Actions', width: 56, hideLabel: true },
];

const COUNTER_COLUMNS: PanelTableColumn<CounterColumn>[] = [
  { id: 'scope', name: 'Scope', isRowHeader: true, defaultWidth: 180 },
  { id: 'l1', name: 'L1', defaultWidth: 160 },
  { id: 'l2', name: 'L2', defaultWidth: 160 },
  { id: 'level', name: 'Level', width: 100 },
  { id: 'capacity', name: 'Capacity', defaultWidth: 260, minWidth: 220 },
  { id: 'num_waiters', name: 'Pending', width: 110 },
  { id: 'rule_pattern', name: 'Matched rule', defaultWidth: 220 },
];

const PLAYGROUND_COLUMNS: PanelTableColumn<PlaygroundColumn>[] = [
  { id: 'source', name: 'Source', width: 90 },
  { id: 'scope', name: 'Scope', isRowHeader: true, defaultWidth: 160 },
  { id: 'l1', name: 'L1', defaultWidth: 140 },
  { id: 'l2', name: 'L2', defaultWidth: 140 },
  { id: 'level', name: 'Level', width: 100 },
  { id: 'matches', name: 'Pattern test', width: 130 },
  { id: 'winning_rule', name: 'Current winning rule', defaultWidth: 230 },
];

const summaryTileStyles = tv({
  base: 'flex min-w-0 items-center gap-2 rounded-xl border border-gray-200 bg-white/80 px-3 py-2 shadow-xs',
});

const patternWorkbenchStyles = tv({
  slots: {
    root: 'flex min-h-0 flex-col',
    form: 'border-b border-gray-200 bg-gray-50/80 px-3 py-3',
    fields: 'grid gap-2 md:grid-cols-[repeat(4,minmax(0,1fr))_auto]',
    addButton:
      'mt-5 flex h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-0.5xs',
    summary: 'mt-2 flex items-center gap-2 text-xs text-gray-500',
  },
  variants: {
    compact: {
      true: {
        root: 'gap-3',
        form: 'rounded-xl border border-gray-200 bg-white/70 p-2 shadow-xs',
        summary: 'px-1',
      },
      false: {
        root: 'gap-0',
      },
    },
  },
});

const capacityMeterStyles = tv({
  slots: {
    root: 'flex min-w-0 flex-col gap-1',
    line: 'flex min-w-0 items-baseline gap-1.5 text-xs',
    value: 'font-semibold text-gray-700',
    status: 'text-gray-400',
    track:
      'h-1.5 w-full max-w-48 overflow-hidden rounded-full border border-gray-200 bg-gray-100',
    fill: 'h-full rounded-full transition-[width]',
  },
  variants: {
    state: {
      unlimited: {
        status: 'text-gray-400',
        track: 'hidden',
        fill: 'bg-transparent',
      },
      available: {
        status: 'text-gray-500',
        fill: 'bg-blue-400',
      },
      saturated: {
        status: 'font-semibold text-orange-700',
        track: 'border-orange-200 bg-orange-50',
        fill: 'bg-orange-500',
      },
    },
  },
});

const ruleHeaderStyles = tv({
  base: 'sticky top-3 z-50 mx-5 mt-2 flex min-w-0 items-center gap-3.5 rounded-2xl border bg-linear-to-r px-3 py-3 shadow-[0_1px_2px_-0.5px_--theme(--color-zinc-800/6%),0_12px_28px_-10px_--theme(--color-zinc-800/12%),inset_0_2px_0_0_--theme(--color-white/95%)] backdrop-blur-xl backdrop-saturate-200 transition-colors sm:top-6',
  variants: {
    disabled: {
      true: 'border-gray-300/70 from-gray-200/70 from-0% via-white via-50% to-gray-100',
      false:
        'border-blue-300/60 from-blue-100 from-0% via-white via-50% to-blue-50',
    },
  },
});

function formatLimit(value: number | null | undefined) {
  return value == null ? 'Unlimited' : formatNumber(value);
}

function nullableText(value: string | number | null | undefined) {
  if (value == null || value === '') return 'none';
  return String(value);
}

function ruleDetailsHref(baseUrl: string, pattern: string) {
  return `${baseUrl}/limits/rules/details?pattern=${encodeURIComponent(pattern)}`;
}

// Depth (× limit): pending / configured limit for a single match. 1× means a
// full extra capacity is queued (≈ doubled wait); ≥ 4× reads as badly jammed.
function counterDepthRatio(
  counter:
    | { num_waiters?: number | null; concurrency_limit?: number | null }
    | null
    | undefined,
): number {
  if (!counter) return 0;
  const limit = counter.concurrency_limit;
  if (limit == null || limit <= 0) return 0;
  return (counter.num_waiters ?? 0) / limit;
}

function summarizeLimitRows(counters: UserLimitRow[]): RuleSummary {
  let worstCounter: WorstCounter | null = null;
  let depthRatio = 0;
  const summary = counters.reduce(
    (acc, counter) => {
      const waiters = counter.num_waiters ?? 0;
      acc.matches += 1;
      acc.pending += waiters;
      acc.backedUp += waiters > 0 ? 1 : 0;
      if (waiters > 0) {
        const ratio = counterDepthRatio(counter);
        if (ratio > depthRatio) {
          depthRatio = ratio;
          worstCounter = counter;
        }
      }
      return acc;
    },
    {
      pending: 0,
      matches: 0,
      backedUp: 0,
      depthRatio: 0,
      worstCounter: null as WorstCounter | null,
    },
  );
  summary.depthRatio = depthRatio;
  summary.worstCounter = worstCounter;
  return summary;
}

function toCounterRows(counters: UserLimitRow[]): CounterRow[] {
  return counters.map((counter, index) => ({
    ...counter,
    id: [
      index,
      counter.scope,
      counter.l1,
      counter.l2,
      counter.level,
      counter.rule_pattern,
    ]
      .map((part) => part ?? 'none')
      .join(':'),
  }));
}

function getRuleSummary(rule: LimitRuleWithStats): RuleSummary {
  const worstCounter = rule.stats?.worst_counter ?? null;
  return {
    pending: rule.stats?.pending ?? 0,
    matches: rule.stats?.matches ?? 0,
    backedUp: rule.stats?.backed_up ?? 0,
    depthRatio: counterDepthRatio(worstCounter),
    worstCounter,
  };
}

function worstCounterKey(counter: WorstCounter) {
  const key = [counter.scope, counter.l1, counter.l2]
    .filter((part): part is string => Boolean(part))
    .join(' / ');
  return key || counter.level || 'counter';
}

function getRuleRows(rules: LimitRuleWithStats[]): RuleRow[] {
  return rules.map((rule) => ({
    ...rule,
    id: rule.pattern,
    summary: getRuleSummary(rule),
  }));
}

// Fraction of a rule's matches that are backed up (have pending work).
// Unlimited rules (null concurrency) sort as the largest limit.
function limitForSort(value: number | null | undefined) {
  return value == null ? Number.POSITIVE_INFINITY : value;
}

function compareRules(a: RuleRow, b: RuleRow, column: RuleSortColumn): number {
  switch (column) {
    case 'pattern':
      return a.pattern.localeCompare(b.pattern);
    case 'limit':
      return (
        limitForSort(a.limits.concurrency) - limitForSort(b.limits.concurrency)
      );
    case 'pending':
      return a.summary.pending - b.summary.pending;
    case 'depth':
      return a.summary.depthRatio - b.summary.depthRatio;
    case 'activeMatches':
      return a.summary.matches - b.summary.matches;
  }
}

function useLimitsAccess() {
  const flagEnabled = useIsFeatureFlagEnabled(LIMITS_FEATURE_FLAG);
  const features = useFeatures();
  return {
    flagEnabled,
    hasVqueues: features.has('vqueues'),
  };
}

function LimitsUnavailable({ reason }: { reason: 'flag' | 'cluster' }) {
  return (
    <EmptyState
      icon={reason === 'flag' ? IconName.Sparkles : IconName.Gauge}
      intent="neutral"
      title={
        reason === 'flag'
          ? 'Vqueue observability is not enabled'
          : 'Limit rules are not available'
      }
      description={
        reason === 'flag'
          ? 'Enable the local vqueue observability feature flag to view limit rules.'
          : 'This Restate cluster does not advertise the vqueues feature.'
      }
    >
      {reason === 'flag' && (
        <Link href="/features" variant="secondary-button">
          Open features
        </Link>
      )}
    </EmptyState>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className={summaryTileStyles()}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 shadow-xs">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-2xs font-medium text-gray-400 uppercase">
          {label}
        </span>
        <span className="truncate text-sm font-semibold text-gray-800">
          {value}
        </span>
      </span>
    </div>
  );
}

function RulePatternCell({
  rule,
  winsLevel,
}: {
  rule: RuleRow;
  winsLevel?: string | null;
}) {
  const { baseUrl } = useRestateContext();
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <PatternChip
        pattern={rule.pattern}
        href={ruleDetailsHref(baseUrl, rule.pattern)}
        disabled={rule.disabled}
        className="min-w-0"
      />
      {winsLevel && (
        <Badge size="xs" variant="info" className="shrink-0 whitespace-nowrap">
          governs {winsLevel}
        </Badge>
      )}
      {rule.disabled && (
        <Badge size="xs" variant="default">
          disabled
        </Badge>
      )}
    </div>
  );
}

// Which level (if any) this pattern governs for the currently-tested key.
function winnerLevelLabel(
  analysis: KeyAnalysis | null | undefined,
  pattern: string,
): string | null {
  if (!analysis) {
    return null;
  }
  if (analysis.byLevel.scope === pattern) {
    return 'scope';
  }
  if (analysis.byLevel.l1 === pattern) {
    return 'L1';
  }
  if (analysis.byLevel.l2 === pattern) {
    return 'L2';
  }
  return null;
}

function LimitValue({
  value,
  disabled,
}: {
  value: number | null | undefined;
  disabled?: boolean;
}) {
  return (
    <Badge
      variant="default"
      className={disabled ? 'font-normal opacity-60' : 'font-normal'}
    >
      concurrency =
      <Badge
        variant="default"
        className="-ml-0.5 leading-3.5 font-semibold tabular-nums"
      >
        {value != null ? (
          formatNumber(value)
        ) : (
          <Icon name={IconName.Infinity} className="h-3.5 w-3.5" />
        )}
      </Badge>
    </Badge>
  );
}

const DEEP_DEPTH_ALERT = 2;

// Depth severity tiers in the app's hue language (gray / amber / red) but
// softened so the table reads polished, not flashy: under limit (<1x) = neutral
// gray, warning (<2x) = amber, alert (>=2x) = red. Badges = soft -50 tint +
// subtle -200 border + dark -700 text (the colored text carries the signal);
// bars = soft -200 fill + a slightly darker -300 edge.
const DEPTH_TIERS = {
  ok: {
    badgeBg: '#f4f4f5',
    badgeBorder: '#e4e4e7',
    barFill: '#d4d4d8',
    barBorder: '#d4d4d8',
    text: '#52525b',
  },
  warn: {
    badgeBg: '#fffbeb',
    badgeBorder: '#fde68a',
    barFill: '#fde68a',
    barBorder: '#fcd34d',
    text: '#b45309',
  },
  alert: {
    badgeBg: '#fef2f2',
    badgeBorder: '#fecaca',
    barFill: '#fecaca',
    barBorder: '#fca5a5',
    text: '#b91c1c',
  },
};

function depthStatus(ratio: number) {
  if (ratio < 1) return DEPTH_TIERS.ok;
  if (ratio < DEEP_DEPTH_ALERT) return DEPTH_TIERS.warn;
  return DEPTH_TIERS.alert;
}

const ruleNumberStyles = tv({
  base: 'text-2xs leading-4 font-medium tabular-nums',
  variants: {
    muted: { true: 'text-zinc-300', false: 'text-zinc-500' },
  },
});

function MetricBar({
  value,
  widthPercent,
  colorRatio,
}: {
  value: ReactNode;
  widthPercent: number;
  colorRatio: number;
}) {
  const { barFill, barBorder } = depthStatus(colorRatio);
  return (
    <div className="flex w-full max-w-40 items-center gap-2">
      <div className="flex h-3 min-w-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 p-0.5">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${widthPercent}%`,
            minWidth: 4,
            backgroundColor: barFill,
            outline: `1px solid ${barBorder}`,
          }}
        />
      </div>
      <span className="mr-2 min-w-5 shrink-0 text-right text-xs font-medium text-zinc-600 tabular-nums">
        {value}
      </span>
    </div>
  );
}

function RulePendingCell({
  summary,
  maxPending,
}: {
  summary: RuleSummary;
  maxPending: number;
}) {
  const { pending, depthRatio } = summary;
  if (pending <= 0) {
    return <span className={ruleNumberStyles({ muted: true })}>0</span>;
  }
  return (
    <MetricBar
      value={formatNumber(pending)}
      widthPercent={Math.max(4, (pending / Math.max(maxPending, 1)) * 100)}
      colorRatio={depthRatio}
    />
  );
}

function DepthTooltip({
  pattern,
  summary,
}: {
  pattern: string;
  summary: RuleSummary;
}) {
  const { baseUrl } = useRestateContext();
  const { depthRatio, worstCounter } = summary;
  if (!worstCounter) return null;
  const { barFill, barBorder } = depthStatus(depthRatio);
  return (
    <div className="flex min-w-52 flex-col">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-mono !text-sm font-medium !text-gray-300">
          {pattern}
        </span>
        <span className="shrink-0 !text-sm !text-gray-300">
          <span className="!text-base font-semibold !text-gray-50">
            {depthRatio.toFixed(1)}×
          </span>{' '}
          depth
        </span>
      </div>
      <div className="-mx-3 border-t border-white/10" />
      <Link
        href={ruleDetailsHref(baseUrl, pattern)}
        preserveQueryParams={false}
        variant="secondary"
        className="-mx-2 mt-2 flex items-center gap-2 rounded-lg border-none bg-transparent px-2 py-1.5 !text-inherit no-underline shadow-none transition hover:bg-white/10"
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: barFill, border: `1px solid ${barBorder}` }}
        />
        <span className="shrink-0 !text-0.5xs !text-gray-400">deepest</span>
        <span className="min-w-0 flex-1 truncate font-mono !text-0.5xs !text-gray-200">
          {worstCounterKey(worstCounter)}
        </span>
        <span className="shrink-0 !text-0.5xs !text-gray-300 tabular-nums">
          {formatNumber(worstCounter.usage ?? 0)}/
          {worstCounter.concurrency_limit == null
            ? '∞'
            : formatNumber(worstCounter.concurrency_limit)}
        </span>
        <span className="shrink-0 !text-0.5xs font-semibold !text-gray-100 tabular-nums">
          {formatNumber(worstCounter.num_waiters ?? 0)} pending
        </span>
        <Icon
          name={IconName.ChevronRight}
          className="h-3 w-3 shrink-0 !text-zinc-500"
        />
      </Link>
    </div>
  );
}

function RuleDepthCell({
  pattern,
  summary,
}: {
  pattern: string;
  summary: RuleSummary;
}) {
  const { pending, depthRatio, worstCounter } = summary;
  if (pending <= 0 || depthRatio <= 0 || !worstCounter) {
    return <span className={ruleNumberStyles({ muted: true })}>—</span>;
  }
  const { badgeBg, badgeBorder, text } = depthStatus(depthRatio);
  return (
    <HoverTooltip
      size="lg"
      content={<DepthTooltip pattern={pattern} summary={summary} />}
    >
      <span className="inline-flex items-center whitespace-nowrap">
        <span
          aria-label={`${depthRatio.toFixed(1)} times limit`}
          className="inline-flex items-center rounded-md border px-1.5 py-0 text-2xs leading-4 font-medium tabular-nums"
          style={{
            backgroundColor: badgeBg,
            borderColor: badgeBorder,
            color: text,
          }}
        >
          {depthRatio.toFixed(1)}x
        </span>
      </span>
    </HoverTooltip>
  );
}

function RuleMatchesCell({ summary }: { summary: RuleSummary }) {
  const { matches, backedUp: overCapacity, depthRatio } = summary;
  if (matches <= 0) {
    return <span className={ruleNumberStyles({ muted: true })}>0</span>;
  }
  const hasOver = overCapacity > 0;
  const overColor = depthStatus(depthRatio).text;

  return (
    <HoverTooltip
      size="lg"
      content={
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="!text-base font-semibold !text-gray-50 tabular-nums">
              {formatNumber(matches)}
            </span>
            <span className="!text-0.5xs !text-gray-400">active matches</span>
          </div>
          <div className="!text-0.5xs !text-gray-400">
            {formatNumber(overCapacity)} over capacity
          </div>
        </div>
      }
    >
      <Badge
        size="sm"
        className="gap-1 leading-3 font-medium tabular-nums"
        aria-label={`${formatNumber(matches)} active matches, ${formatNumber(overCapacity)} over capacity`}
      >
        <Icon name={IconName.Ellipsis} className="h-3 w-3 text-zinc-400" />
        {formatNumber(matches)}
      </Badge>
      {hasOver && (
        <>
          <span className="mx-1 text-zinc-300" aria-hidden="true">
            /
          </span>
          <Badge
            size="sm"
            className="gap-1 leading-3 font-medium tabular-nums"
            style={{ color: overColor }}
          >
            <Icon name={IconName.Usage} className="h-3 w-3" />
            {formatNumber(overCapacity)}
          </Badge>
        </>
      )}
    </HoverTooltip>
  );
}

function CapacityMeter({ row }: { row: UserLimitRow }) {
  const limit = row.concurrency_limit;
  const usage = row.usage ?? 0;
  const available = row.available;
  const state =
    limit == null ? 'unlimited' : available === 0 ? 'saturated' : 'available';
  const { root, line, value, status, track, fill } = capacityMeterStyles({
    state,
  });
  const percent =
    limit == null || limit <= 0
      ? 0
      : Math.min(100, Math.max(0, (usage / limit) * 100));
  const statusText =
    limit == null
      ? 'Unlimited'
      : available === 0
        ? 'At limit'
        : `${formatNumber(available ?? 0)} available`;

  return (
    <div className={root()}>
      <div className={line()}>
        <span className={value()}>
          {limit == null
            ? 'Unlimited'
            : `${formatNumber(usage)} / ${formatNumber(limit)} used`}
        </span>
        <span className={status()}>{statusText}</span>
      </div>
      <div className={track()} aria-hidden="true">
        <div className={fill()} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function PatternBadge({
  pattern,
  disabled,
  className,
}: {
  pattern: string | null | undefined;
  disabled?: boolean;
  className?: string;
}) {
  if (!pattern) {
    return (
      <Badge size="sm" className={className}>
        none
      </Badge>
    );
  }
  return (
    <Badge
      size="sm"
      variant={disabled ? 'default' : 'info'}
      className={className}
    >
      <span className="min-w-0 truncate font-mono">{pattern}</span>
    </Badge>
  );
}

function NumericBadge({
  value,
  muted,
}: {
  value: number | null | undefined;
  muted?: boolean;
}) {
  return (
    <Badge
      size="sm"
      className={muted ? 'border-none bg-transparent text-zinc-400' : ''}
    >
      {value == null ? 'none' : formatNumber(value)}
    </Badge>
  );
}

function RuleEnabledSwitch({
  rule,
  labelOnHover,
}: {
  rule: LimitRule;
  labelOnHover?: boolean;
}) {
  const update = useUpdateLimitRule();
  const enabled = !rule.disabled;
  const switchEl = (
    <Switch
      aria-label={`${enabled ? 'Disable' : 'Enable'} ${rule.pattern}`}
      isSelected={enabled}
      isDisabled={update.isPending}
      onChange={(value) => {
        update.mutate({
          pattern: rule.pattern,
          description: rule.description ?? null,
          disabled: !value,
          limits: rule.limits,
          version: rule.version,
        });
      }}
      className="text-xs"
    >
      {!labelOnHover && (
        <span className="text-xs font-medium text-gray-600">
          {enabled ? 'On' : 'Off'}
        </span>
      )}
    </Switch>
  );
  if (!labelOnHover) {
    return switchEl;
  }
  // In the table, keep the cell clean: show the On/Off label only on row hover.
  return (
    <span className="relative inline-flex items-center">
      {switchEl}
      <span className="pointer-events-none absolute left-full ml-1.5 text-xs font-medium text-gray-500 opacity-0 transition group-hover/row:opacity-100">
        {enabled ? 'On' : 'Off'}
      </span>
    </span>
  );
}

const rulePrimaryActionStyles = tv({
  base: 'invisible absolute right-full z-2 flex translate-x-px items-center gap-1 rounded-l-md rounded-r-none px-2.5 py-0.5 text-0.5xs whitespace-nowrap text-gray-600 drop-shadow-[-20px_2px_4px_--theme(--color-gray-100/0.5)] group-hover:visible',
});

function RuleActions({
  rule,
  onEdit,
  onDelete,
}: {
  rule: LimitRule;
  onEdit: (rule: LimitRule) => void;
  onDelete: (rule: LimitRule) => void;
}) {
  return (
    <div className="flex justify-end">
      <SplitButton
        mini
        onSelect={(key) => {
          if (key === 'edit') onEdit(rule);
          if (key === 'delete') onDelete(rule);
        }}
        menus={[
          <DropdownItem key="edit" value="edit">
            <Icon
              name={IconName.Pencil}
              className="h-3.5 w-3.5 shrink-0 opacity-80"
            />
            Edit…
          </DropdownItem>,
          <DropdownItem key="delete" value="delete" destructive>
            <Icon
              name={IconName.Trash}
              className="h-3.5 w-3.5 shrink-0 opacity-80"
            />
            Delete…
          </DropdownItem>,
        ]}
      >
        <Button
          variant="secondary"
          onClick={() => onEdit(rule)}
          className={rulePrimaryActionStyles()}
        >
          Edit
        </Button>
      </SplitButton>
    </div>
  );
}

const ruleDescriptionStyles = tv({
  base: 'block min-w-0 truncate text-xs',
  variants: {
    disabled: {
      true: 'text-gray-400',
      false: 'text-gray-500',
    },
  },
});

function renderRuleCell(
  row: RuleRow,
  column: PanelTableColumn<RuleColumn>,
  context: {
    onEdit: (rule: LimitRule) => void;
    onDelete: (rule: LimitRule) => void;
    maxPending: number;
    keyAnalysis?: KeyAnalysis | null;
  },
) {
  switch (column.id) {
    case 'pattern':
      return (
        <Cell>
          <RulePatternCell
            rule={row}
            winsLevel={winnerLevelLabel(context.keyAnalysis, row.pattern)}
          />
        </Cell>
      );
    case 'limit':
      return (
        <Cell>
          <LimitValue value={row.limits.concurrency} disabled={row.disabled} />
        </Cell>
      );
    case 'pending':
      return (
        <Cell>
          <RulePendingCell
            summary={row.summary}
            maxPending={context.maxPending}
          />
        </Cell>
      );
    case 'depth':
      return (
        <Cell>
          <RuleDepthCell pattern={row.pattern} summary={row.summary} />
        </Cell>
      );
    case 'activeMatches':
      return (
        <Cell>
          <RuleMatchesCell summary={row.summary} />
        </Cell>
      );
    case 'enabled':
      return (
        <Cell className="overflow-visible">
          <RuleEnabledSwitch rule={row} labelOnHover />
        </Cell>
      );
    case 'description':
      return (
        <Cell>
          <span className={ruleDescriptionStyles({ disabled: row.disabled })}>
            <TruncateWithTooltip>
              {row.description || 'No description'}
            </TruncateWithTooltip>
          </span>
        </Cell>
      );
    case 'actions':
      return (
        <Cell className="overflow-visible">
          <RuleActions
            rule={row}
            onEdit={context.onEdit}
            onDelete={context.onDelete}
          />
        </Cell>
      );
  }
}

function renderCounterCell(
  row: CounterRow,
  column: PanelTableColumn<CounterColumn>,
  currentRule?: string,
) {
  const isCurrentRule =
    column.id === 'rule_pattern' &&
    currentRule !== undefined &&
    row.rule_pattern === currentRule;
  switch (column.id) {
    case 'scope':
    case 'l1':
    case 'l2':
    case 'level':
      return (
        <Cell>
          <span className="block min-w-0 truncate font-mono text-xs">
            <TruncateWithTooltip>
              {nullableText(row[column.id])}
            </TruncateWithTooltip>
          </span>
        </Cell>
      );
    case 'capacity':
      return (
        <Cell>
          <CapacityMeter row={row} />
        </Cell>
      );
    case 'rule_pattern':
      return (
        <Cell>
          <PatternBadge
            pattern={row.rule_pattern}
            className={isCurrentRule ? 'ring-1 ring-blue-300' : undefined}
          />
        </Cell>
      );
    default:
      return (
        <Cell>
          <NumericBadge value={row.num_waiters} muted={!row.num_waiters} />
        </Cell>
      );
  }
}

function RulesHero() {
  return (
    <div className="flex flex-col gap-1.5 pr-2 pl-10">
      <div className="flex items-center gap-2">
        <Icon name={IconName.Gauge} className="h-6 w-6 shrink-0 text-gray-400" />
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">
          Limit rules
        </h1>
      </div>
      <p className="max-w-2xl text-sm leading-relaxed text-gray-500">
        Apply limits to invocations, matched by a scope and an optional
        hierarchical key. When several rules match, the most specific one wins
        independently at each level.
      </p>
    </div>
  );
}

function RuleSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <SearchField
      aria-label="Test a key against the rules"
      value={value}
      onChange={onChange}
      className="relative flex min-w-0 max-w-[22rem] flex-1 items-center"
    >
      <Label className="sr-only">Test a key against the rules</Label>
      <Icon
        name={IconName.Search}
        className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-gray-400"
      />
      <AriaInput
        placeholder="Test a key — e.g. acme/team"
        spellCheck={false}
        className="h-8 w-full rounded-xl border border-transparent bg-transparent pr-7 pl-8 font-mono text-xs text-gray-700 outline-none transition placeholder:font-sans placeholder:text-gray-400 hover:border-gray-200 hover:bg-gray-100 focus:border-gray-200 focus:bg-gray-100"
      />
    </SearchField>
  );
}

function LimitsListComponent() {
  const { flagEnabled, hasVqueues } = useLimitsAccess();
  const { baseUrl } = useRestateContext();
  const navigate = useNavigate();
  const [editingRule, setEditingRule] = useState<LimitRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<LimitRule | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rules = useListLimitRules({
    includeStats: true,
    enabled: flagEnabled && hasVqueues,
  });

  const ruleRows = useMemo(
    () => getRuleRows(rules.data?.rules ?? []),
    [rules.data?.rules],
  );
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'pending',
    direction: 'descending',
  });
  const maxPending = useMemo(
    () =>
      ruleRows.reduce((max, rule) => Math.max(max, rule.summary.pending), 0),
    [ruleRows],
  );
  const sortedRows = useMemo(() => {
    const column = sortDescriptor.column as RuleSortColumn;
    const factor = sortDescriptor.direction === 'descending' ? -1 : 1;
    return [...ruleRows].sort((a, b) => {
      const primary = compareRules(a, b, column);
      if (primary !== 0) return factor * primary;
      return a.pattern.localeCompare(b.pattern);
    });
  }, [ruleRows, sortDescriptor]);

  const parsedRules = useMemo(
    () =>
      ruleRows
        .map((row) => parsePattern(row.pattern, row))
        .filter((parsed): parsed is ParsedPattern<RuleRow> => parsed !== null),
    [ruleRows],
  );
  const trimmedQuery = query.trim();
  const searchKey = useMemo(
    () => (trimmedQuery ? parseKey(trimmedQuery) : null),
    [trimmedQuery],
  );
  const keyAnalysis = useMemo(
    () => (searchKey ? analyzeKey(parsedRules, searchKey) : null),
    [searchKey, parsedRules],
  );
  const filteredRows = useMemo(() => {
    if (!trimmedQuery) return sortedRows;
    if (keyAnalysis) {
      return sortedRows.filter((row) => keyAnalysis.applicable.has(row.pattern));
    }
    const needle = trimmedQuery.toLowerCase();
    return sortedRows.filter((row) =>
      row.pattern.toLowerCase().includes(needle),
    );
  }, [sortedRows, trimmedQuery, keyAnalysis]);

  if (!flagEnabled) return <LimitsUnavailable reason="flag" />;
  if (!hasVqueues) return <LimitsUnavailable reason="cluster" />;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-4 pt-20">
      <RulesHero />
      <ContentPanel>
        <ContentPanelToolbar className="justify-between gap-2 px-2">
          <RuleSearch value={query} onChange={setQuery} />
          <Button
            type="button"
            variant="primary"
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-0.5xs"
            onClick={() => setCreateOpen(true)}
          >
            <Icon name={IconName.Plus} className="h-3.5 w-3.5" />
            New rule
          </Button>
        </ContentPanelToolbar>
        <ContentPanelBody className="pb-24">
          <ContentPanelSection flush>
            <PanelTable
              aria-label="Limit rules"
              columns={RULE_COLUMNS}
              items={filteredRows}
              sortDescriptor={sortDescriptor}
              onSortChange={setSortDescriptor}
              bodyDependencies={[maxPending, trimmedQuery]}
              rowDependencies={[maxPending, trimmedQuery]}
              isLoading={rules.isPending}
              error={rules.error as Error | null}
              emptyPlaceholder={
                <EmptyState
                  icon={trimmedQuery ? IconName.ScanSearch : IconName.Gauge}
                  title={trimmedQuery ? 'No matching rules' : 'No limit rules'}
                  description={
                    trimmedQuery
                      ? 'No rule matches that key — it would be unlimited.'
                      : 'Create a rule to configure concurrency limits.'
                  }
                />
              }
              renderCell={(row, column) =>
                renderRuleCell(row, column, {
                  onEdit: setEditingRule,
                  onDelete: setDeletingRule,
                  maxPending,
                  keyAnalysis,
                })
              }
              onRowAction={(key) => {
                navigate(ruleDetailsHref(baseUrl, String(key)));
              }}
            />
          </ContentPanelSection>
        </ContentPanelBody>
      </ContentPanel>
      <RuleFormDialog
        open={isCreateOpen}
        onOpenChange={setCreateOpen}
        onCreated={(rule) => {
          if (rule) navigate(ruleDetailsHref(baseUrl, rule.pattern));
        }}
      />
      <RuleFormDialog
        open={Boolean(editingRule)}
        onOpenChange={(open) => {
          if (!open) setEditingRule(null);
        }}
        rule={editingRule ?? undefined}
      />
      <DeleteRuleDialog
        rule={deletingRule}
        onOpenChange={(open) => {
          if (!open) setDeletingRule(null);
        }}
      />
    </div>
  );
}

function RuleDetailComponent() {
  const { flagEnabled, hasVqueues } = useLimitsAccess();
  const { baseUrl } = useRestateContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pattern = searchParams.get('pattern') ?? undefined;
  const selectedTab =
    searchParams.get(DETAILS_TAB_QUERY) === 'playground'
      ? 'playground'
      : 'counters';
  const details = useGetLimitRuleWithLimits(pattern, {
    enabled: flagEnabled && hasVqueues && Boolean(pattern),
  });
  const [isEditOpen, setEditOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const allCounters = useListUserLimits({
    enabled: flagEnabled && hasVqueues && selectedTab === 'playground',
  });

  const rule = details.data?.rule;
  const counterRows = useMemo(
    () => toCounterRows(details.data?.limits ?? []),
    [details.data?.limits],
  );
  const summary = summarizeLimitRows(details.data?.limits ?? []);

  if (!flagEnabled) return <LimitsUnavailable reason="flag" />;
  if (!hasVqueues) return <LimitsUnavailable reason="cluster" />;
  if (!pattern) {
    return (
      <EmptyState
        icon={IconName.Gauge}
        title="No rule selected"
        description="Open a configured rule to inspect its active limits."
      >
        <Link href={`${baseUrl}/limits/rules`} variant="secondary-button">
          Back to rules
        </Link>
      </EmptyState>
    );
  }

  if (details.error && !rule) {
    return (
      <div className="flex min-h-0 flex-1 flex-col pt-4">
        <RuleBreadcrumb pattern={pattern} />
        <EmptyState
          icon={IconName.ScanSearch}
          intent="neutral"
          title="This rule could not be loaded"
          description="The rule may have been deleted or changed."
        >
          <ErrorBanner error={details.error as Error} className="rounded-xl" />
          <Link href={`${baseUrl}/limits/rules`} variant="secondary-button">
            Back to rules
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col pt-4 [--cp-toolbar-top:5rem] [--cp-toolbar-tuck:5rem]">
      <RuleBreadcrumb pattern={pattern} />
      <div className={ruleHeaderStyles({ disabled: rule?.disabled })}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-xs">
            <Icon name={IconName.Gauge} className="h-4.5 w-4.5 text-blue-500" />
          </span>
          <h1 className="min-w-0 truncate font-mono text-sm font-semibold text-gray-700">
            {pattern}
          </h1>
          {rule?.disabled && (
            <Badge size="sm" variant="default">
              disabled
            </Badge>
          )}
        </div>
        {rule && (
          <div className="flex shrink-0 items-center gap-2">
            <RuleEnabledSwitch rule={rule} />
            <Button
              type="button"
              variant="secondary"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-0.5xs"
              onClick={() => setEditOpen(true)}
            >
              <Icon name={IconName.Pencil} className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-0.5xs text-red-600 hover:bg-red-50"
              onClick={() => setDeleteOpen(true)}
            >
              <Icon name={IconName.Trash} className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        )}
      </div>
      <div className="relative z-10 grid gap-2 px-5 pt-6 md:grid-cols-4">
        <SummaryTile
          icon={IconName.Gauge}
          label="Concurrency"
          value={formatLimit(rule?.limits.concurrency)}
        />
        <SummaryTile
          icon={IconName.ClockAlert}
          label="Pending"
          value={formatNumber(summary.pending)}
        />
        <SummaryTile
          icon={IconName.ChartNoAxesCombined}
          label="Deepest match"
          value={
            summary.depthRatio > 0 ? `${summary.depthRatio.toFixed(1)}×` : '—'
          }
        />
        <SummaryTile
          icon={IconName.Radio}
          label="Backed up"
          value={
            <>
              {formatNumber(summary.backedUp)}
              <span className="font-normal text-gray-400">
                {' / '}
                {formatNumber(summary.matches)}
              </span>
            </>
          }
        />
      </div>
      {rule && (
        <div className="relative z-10 grid gap-2 px-5 pt-2 md:grid-cols-3">
          <RuleMeta label="Description">
            {rule.description || 'No description'}
          </RuleMeta>
          <RuleMeta label="Version">{formatNumber(rule.version)}</RuleMeta>
          <RuleMeta label="Last modified">
            {formatDateTime(
              new Date(rule.last_modified_millis_since_epoch),
              'system',
            )}
          </RuleMeta>
        </div>
      )}
      <ContentPanel
        className="-mt-12"
        tabs={{
          items: [
            {
              id: 'counters',
              label: 'Active limits',
              href: ruleDetailsHref(baseUrl, pattern),
            },
            {
              id: 'playground',
              label: 'Pattern workbench',
              href: `${ruleDetailsHref(baseUrl, pattern)}&${DETAILS_TAB_QUERY}=playground`,
            },
          ],
          selectedId: selectedTab,
        }}
      >
        <ContentPanelBody className="pb-24">
          <ContentPanelSection flush>
            {selectedTab === 'counters' ? (
              <PanelTable
                aria-label="Active limits for rule"
                columns={COUNTER_COLUMNS.filter(
                  (column) => column.id !== 'rule_pattern',
                )}
                items={counterRows}
                isLoading={details.isPending}
                error={details.error as Error | null}
                emptyPlaceholder={
                  <EmptyState
                    icon={IconName.Radio}
                    title="No active limits"
                    description="This rule is configured, but no active limits currently resolve to it."
                  />
                }
                renderCell={(row, column) =>
                  renderCounterCell(
                    row,
                    column as PanelTableColumn<CounterColumn>,
                  )
                }
              />
            ) : (
              <PatternWorkbench
                pattern={pattern}
                counters={allCounters.data?.limits ?? []}
                isLoading={allCounters.isPending}
                error={allCounters.error as Error | null}
              />
            )}
          </ContentPanelSection>
        </ContentPanelBody>
      </ContentPanel>
      {rule && (
        <>
          <RuleFormDialog
            open={isEditOpen}
            onOpenChange={setEditOpen}
            rule={rule}
          />
          <DeleteRuleDialog
            rule={isDeleteOpen ? rule : null}
            onOpenChange={(open) => {
              setDeleteOpen(open);
            }}
            onDeleted={() => navigate(`${baseUrl}/limits/rules`)}
          />
        </>
      )}
    </div>
  );
}

function RuleMeta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-200 bg-white/80 px-3 py-2 shadow-xs">
      <div className="text-2xs font-medium text-gray-400 uppercase">
        {label}
      </div>
      <div className="min-w-0 truncate text-sm font-semibold text-gray-700">
        <TruncateWithTooltip>{children}</TruncateWithTooltip>
      </div>
    </div>
  );
}

function RuleBreadcrumb({ pattern }: { pattern?: string }) {
  const { baseUrl } = useRestateContext();
  return (
    <div className="@container mt-8 flex items-center gap-1.5 px-5 text-sm text-gray-500 md:mt-0">
      <Link
        className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
        variant="secondary"
        href={`${baseUrl}/limits/rules`}
      >
        <Icon name={IconName.ArrowLeft} className="h-4 w-4" />
        Limits
      </Link>
      <span className="text-gray-300">/</span>
      <h1 className="flex min-w-0 items-center gap-1.5 truncate py-0.5 font-mono text-sm font-normal text-gray-600">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-xs">
          <Icon name={IconName.Gauge} className="h-4 w-4 text-blue-500" />
        </span>
        <span className="min-w-0 truncate">{pattern}</span>
        {pattern && (
          <Copy
            copyText={pattern}
            className="ml-0 shrink-0 rounded-md p-1 [&_svg]:h-3 [&_svg]:w-3"
          />
        )}
      </h1>
    </div>
  );
}

function parseConcurrency(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function RuleFormDialog({
  open,
  onOpenChange,
  rule,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: LimitRule;
  onCreated?: (rule: LimitRule | undefined) => void;
}) {
  const create = useCreateLimitRule();
  const update = useUpdateLimitRule();
  const isEditing = Boolean(rule);
  const [fields, setFields] = useState<PatternFields>(() =>
    splitPatternToFields(rule?.pattern ?? ''),
  );
  const [concurrency, setConcurrency] = useState(
    rule?.limits.concurrency == null ? '' : String(rule.limits.concurrency),
  );
  const [description, setDescription] = useState(rule?.description ?? '');
  const [enabled, setEnabled] = useState(!(rule?.disabled ?? false));
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;
  const pattern = isEditing ? (rule?.pattern ?? '') : buildPattern(fields);

  useEffect(() => {
    if (!open) return;
    setFields(splitPatternToFields(rule?.pattern ?? ''));
    setConcurrency(
      rule?.limits.concurrency == null ? '' : String(rule.limits.concurrency),
    );
    setDescription(rule?.description ?? '');
    setEnabled(!(rule?.disabled ?? false));
  }, [open, rule]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const limits = { concurrency: parseConcurrency(concurrency) };
    if (rule) {
      const request: UpdateLimitRuleRequest = {
        pattern: rule.pattern,
        description: description.trim() || null,
        disabled: !enabled,
        limits,
        version: rule.version,
      };
      update.mutate(request, {
        onSuccess() {
          onOpenChange(false);
        },
      });
    } else {
      const request: CreateLimitRuleRequest = {
        pattern: pattern.trim(),
        description: description.trim() || null,
        disabled: !enabled,
        limits,
      };
      create.mutate(request, {
        onSuccess(created) {
          onOpenChange(false);
          onCreated?.(created);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form className="flex flex-col gap-5" onSubmit={submit}>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-xs">
              <Icon name={IconName.Gauge} className="h-5 w-5 text-blue-500" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Edit limit rule' : 'Create limit rule'}
              </h2>
              <p className="text-sm text-gray-500">
                {isEditing
                  ? 'Update the concurrency limit for this pattern.'
                  : 'Match invocations by scope and key, then cap their concurrency.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-gray-600">Pattern</span>
            {isEditing ? (
              <div className="flex flex-wrap items-center gap-2">
                <PatternChip pattern={pattern} />
                <span className="text-2xs text-gray-400">
                  A pattern can't be changed after creation.
                </span>
              </div>
            ) : (
              <PatternBuilder fields={fields} onChange={setFields} />
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-[11rem_minmax(0,1fr)]">
            <FormFieldInput
              label="Concurrency"
              value={concurrency}
              onChange={setConcurrency}
              placeholder="Unlimited"
              type="number"
            />
            <FormFieldInput
              label="Description"
              value={description}
              onChange={setDescription}
              placeholder="No description"
            />
          </div>

          <Switch
            isSelected={enabled}
            onChange={setEnabled}
            className="w-fit text-sm font-medium text-gray-700"
          >
            Enabled
          </Switch>

          {pattern && <MatchExamples pattern={pattern} />}

          <DialogFooter>
            <div className="flex flex-col gap-2">
              {error && <ErrorBanner error={error as Error} />}
              <div className="grid grid-cols-2 gap-2">
                <DialogClose>
                  <Button variant="secondary" disabled={pending}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={pending || !pattern.trim()}
                >
                  {isEditing ? 'Save rule' : 'Create rule'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteRuleDialog({
  rule,
  onOpenChange,
  onDeleted,
}: {
  rule: LimitRule | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const mutation = useDeleteLimitRule();
  return (
    <ConfirmationDialog
      open={Boolean(rule)}
      onOpenChange={onOpenChange}
      title="Delete limit rule"
      icon={IconName.Trash}
      iconClassName="text-red-500"
      description={
        <span>
          Delete <span className="font-mono">{rule?.pattern}</span> from the
          rule book.
        </span>
      }
      submitText="Delete rule"
      submitVariant="destructive"
      formMethod="DELETE"
      isPending={mutation.isPending}
      error={mutation.error as Error | null}
      onSubmit={(event) => {
        event.preventDefault();
        if (!rule) return;
        mutation.mutate(
          {
            pattern: rule.pattern,
            expected_version: rule.version,
          },
          {
            onSuccess() {
              onOpenChange(false);
              onDeleted?.();
            },
          },
        );
      }}
    />
  );
}

function rowSegments(row: Pick<UserLimitRow, 'scope' | 'l1' | 'l2'>) {
  return [row.scope, row.l1, row.l2].filter((segment): segment is string =>
    Boolean(segment),
  );
}

function patternMatchesRow(pattern: string, row: UserLimitRow) {
  const parts = pattern.split('/').filter(Boolean);
  if (parts.length === 0) return false;
  if (parts.length === 1 && parts[0] === '*') return true;
  const segments = rowSegments(row);
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (part === '*') return true;
    if (part !== segments[index]) return false;
  }
  return parts.length === segments.length;
}

function PatternWorkbench({
  pattern,
  counters,
  compact,
  isLoading,
  error,
}: {
  pattern: string;
  counters: UserLimitRow[];
  compact?: boolean;
  isLoading: boolean;
  error: Error | null;
}) {
  const [samples, setSamples] = useState<PlaygroundRow[]>([]);
  const [scope, setScope] = useState('');
  const [l1, setL1] = useState('');
  const [l2, setL2] = useState('');
  const [level, setLevel] = useState('');
  const rows = useMemo<PlaygroundRow[]>(
    () => [
      ...counters.map((counter, index) => ({
        ...counter,
        id: `live:${index}:${counter.scope ?? ''}:${counter.l1 ?? ''}:${counter.l2 ?? ''}:${counter.level ?? ''}`,
        source: 'live' as const,
      })),
      ...samples,
    ],
    [counters, samples],
  );
  const matches = rows.filter((row) => patternMatchesRow(pattern, row)).length;
  const { root, form, fields, addButton, summary } = patternWorkbenchStyles({
    compact,
  });
  const addSample = () => {
    const next: PlaygroundRow = {
      id: `sample:${Date.now()}:${samples.length}`,
      source: 'sample',
      scope: scope.trim() || null,
      l1: l1.trim() || null,
      l2: l2.trim() || null,
      level: level.trim() || null,
      usage: null,
      concurrency_limit: null,
      rule_pattern: null,
      available: null,
      num_waiters: null,
    };
    setSamples((current) => [...current, next]);
    setScope('');
    setL1('');
    setL2('');
    setLevel('');
  };

  return (
    <div className={root()}>
      <div className={form()}>
        <div className={fields()}>
          <FormFieldInput
            label="Scope"
            value={scope}
            onChange={setScope}
            placeholder="scope"
          />
          <FormFieldInput
            label="L1"
            value={l1}
            onChange={setL1}
            placeholder="l1"
          />
          <FormFieldInput
            label="L2"
            value={l2}
            onChange={setL2}
            placeholder="l2"
          />
          <FormFieldInput
            label="Level"
            value={level}
            onChange={setLevel}
            placeholder="level"
          />
          <Button
            type="button"
            variant="secondary"
            className={addButton()}
            onClick={addSample}
          >
            <Icon name={IconName.Plus} className="h-3.5 w-3.5" />
            Add sample
          </Button>
        </div>
        <div className={summary()}>
          <Badge size="sm" variant="info">
            {formatNumber(matches)} matching
          </Badge>
          <Badge size="sm">
            {formatNumber(rows.length - matches)} not matching
          </Badge>
        </div>
      </div>
      <PanelTable
        aria-label="Pattern workbench"
        columns={PLAYGROUND_COLUMNS}
        items={rows}
        isLoading={isLoading}
        error={error}
        numOfRows={compact ? 5 : undefined}
        emptyPlaceholder={
          <EmptyState
            icon={IconName.Binoculars}
            title="No active limits"
            description="Add a sample row to test this pattern."
          />
        }
        renderCell={(row, column) => renderPlaygroundCell(row, column, pattern)}
      />
    </div>
  );
}

function renderPlaygroundCell(
  row: PlaygroundRow,
  column: PanelTableColumn<PlaygroundColumn>,
  pattern: string,
) {
  const matches = patternMatchesRow(pattern, row);
  switch (column.id) {
    case 'source':
      return (
        <Cell>
          <Badge size="sm" variant={row.source === 'live' ? 'info' : 'default'}>
            {row.source}
          </Badge>
        </Cell>
      );
    case 'scope':
    case 'l1':
    case 'l2':
    case 'level':
      return (
        <Cell>
          <span className="block min-w-0 truncate font-mono text-xs">
            <TruncateWithTooltip>
              {nullableText(row[column.id])}
            </TruncateWithTooltip>
          </span>
        </Cell>
      );
    case 'matches':
      return (
        <Cell>
          <Badge size="sm" variant={matches ? 'success' : 'default'}>
            {matches ? 'Matches' : 'No match'}
          </Badge>
        </Cell>
      );
    case 'winning_rule':
      return (
        <Cell>
          <PatternBadge pattern={row.rule_pattern} />
        </Cell>
      );
  }
}

export const limits = { Component: LimitsListComponent };
export const limitRule = { Component: RuleDetailComponent };
