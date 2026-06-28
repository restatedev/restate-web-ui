import {
  CreateLimitRuleRequest,
  LimitRule,
  LimitRuleStats,
  LimitRuleWithStats,
  LimitTargetRow,
  UpdateLimitRuleRequest,
  UserLimitRow,
  useCreateLimitRule,
  useDeleteLimitRule,
  useGetLimitRule,
  useListLimitCounters,
  useListLimitRules,
  useListLimitTargets,
  useUpdateLimitRule,
} from '@restate/data-access/admin-api-hooks';
import { useFeatures } from '@restate/data-access/admin-api';
import type { InvocationVqueue } from '@restate/data-access/admin-api-spec';
import { Ellipsis } from '@restate/ui/loading';
import { InvocationId, Target } from '@restate/features/invocation-route';
import { useRestateContext } from '@restate/features/restate-context';
import { Vqueue, VqueueId, VqueueStatus } from '@restate/features/vqueue';
import { Badge } from '@restate/ui/badge';
import { Button } from '@restate/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
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
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { Link } from '@restate/ui/link';
import { SplitButton } from '@restate/ui/split-button';
import { Cell, PanelTable, PanelTableColumn } from '@restate/ui/table';
import {
  DateTooltip,
  HoverTooltip,
  TruncateWithTooltip,
} from '@restate/ui/tooltip';
import { formatDurations, formatNumber } from '@restate/util/intl';
import { tv } from '@restate/util/styles';
import { useIsFeatureFlagEnabled } from '@restate/util/feature-flag';
import {
  SnapshotTimeProvider,
  useDurationSinceLastSnapshot,
} from '@restate/util/snapshot-time';
import {
  FormEvent,
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import {
  Input as AriaInput,
  Label,
  SearchField,
  type SortDescriptor,
} from 'react-aria-components';
import { useNavigate, useParams, useSearchParams } from 'react-router';
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
  PatternChip,
  type KeyAnalysis,
  type ParsedPattern,
} from '@restate/features/limits-ui';
import { LimitsQueryBar } from './LimitsQueryBar';
import {
  COUNTER_PRESETS,
  COUNTER_SCHEMA,
  COUNTER_SORTS,
  TARGET_PRESETS,
  TARGET_SCHEMA,
  TARGET_SORTS,
} from './limitsSchema';
import {
  getLimitsFormSignature,
  useLimitsParameters,
  type LimitSort,
} from './useLimitsQuery';

const LIMITS_FEATURE_FLAG = 'FEATURE_VQUEUE_OBSERVABILITY';

const COUNTER_DEFAULT_SORT: LimitSort = { field: 'num_waiters', order: 'DESC' };
const TARGET_DEFAULT_SORT: LimitSort = { field: 'head_wait', order: 'DESC' };

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

type CounterColumn = 'key' | 'usage' | 'depth' | 'num_waiters';

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
    name: 'Waiting queues',
    allowsSorting: true,
    defaultWidth: 175,
    minWidth: 150,
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
        <span>Counters</span>
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
  {
    id: 'key',
    name: 'Counter',
    isRowHeader: true,
    defaultWidth: 280,
    minWidth: 220,
  },
  {
    id: 'usage',
    name: (
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <span>Usage</span>
        <span className="inline-flex items-center gap-0.5 text-0.5xs text-zinc-500">
          (% limit)
        </span>
      </span>
    ),
    width: 130,
  },
  {
    id: 'depth',
    name: (
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <span>Depth</span>
        <span className="inline-flex items-center gap-0.5 text-0.5xs text-zinc-500">
          (x limit)
        </span>
      </span>
    ),
    width: 110,
  },
  { id: 'num_waiters', name: 'Waiting queues', minWidth: 180 },
];

const ruleHeaderStyles = tv({
  base: 'sticky top-3 z-50 mx-5 mt-2 flex items-center gap-3 rounded-2xl border bg-linear-to-r px-3 py-3 shadow-[0_1px_2px_-0.5px_--theme(--color-zinc-800/6%),0_12px_28px_-10px_--theme(--color-zinc-800/12%),inset_0_2px_0_0_--theme(--color-white/95%)] backdrop-blur-xl backdrop-saturate-200 transition-colors sm:top-6',
  variants: {
    disabled: {
      true: 'border-gray-300/60 from-gray-200/50 from-0% via-white via-50% to-gray-100',
      false:
        'border-blue-300/60 from-blue-100 from-0% via-white via-50% to-blue-50',
    },
  },
  defaultVariants: { disabled: false },
});

function counterKey(row: Pick<UserLimitRow, 'scope' | 'l1' | 'l2'>): string {
  return [row.scope, row.l1, row.l2].filter(Boolean).join('/');
}

function ruleDetailsHref(baseUrl: string, pattern: string) {
  return `${baseUrl}/limits/rules/${encodeURIComponent(pattern)}`;
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
      icon={reason === 'flag' ? IconName.Sparkles : IconName.SlidersHorizontal}
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

const ruleStatusStyles = tv({
  base: 'inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed py-0.5 pr-2 pl-0.5',
  variants: {
    disabled: {
      true: 'border-zinc-400/70',
      false: 'border-blue-300/80',
    },
  },
});

const ruleStatusLabelStyles = tv({
  base: 'text-sm font-medium',
  variants: {
    disabled: {
      true: 'text-zinc-500',
      false: 'text-blue-700',
    },
  },
});

// Enabled/disabled lives in a subtle pill on the right of the header: a status
// dot (a live "ping" when enabled, static gray when disabled) + the label.
const ruleStatusPillStyles = tv({
  base: 'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 ring-1 ring-inset',
  variants: {
    disabled: {
      true: 'bg-white/60 ring-black/5',
      false: 'bg-white/70 ring-blue-200/70',
    },
  },
});

// The limit value sits in a raised white chip (border + shadow) so it reads as
// the key figure; its number is blue when enabled, dimmed when disabled.
const ruleLimitBadgeStyles = tv({
  base: 'border-gray-200 bg-white text-sm font-semibold tabular-nums shadow-sm',
  variants: {
    disabled: {
      true: 'text-zinc-400',
      false: 'text-blue-700',
    },
  },
});

function RuleStatus({ rule }: { rule: LimitRule }) {
  const limit = rule.limits.concurrency;
  return (
    <div className={ruleStatusStyles({ disabled: rule.disabled })}>
      <Badge
        size="sm"
        className={ruleLimitBadgeStyles({ disabled: rule.disabled })}
      >
        {limit == null ? (
          <Icon name={IconName.Infinity} className="h-3.5 w-3.5" />
        ) : (
          formatNumber(limit)
        )}
      </Badge>
      <span className={ruleStatusLabelStyles({ disabled: rule.disabled })}>
        concurrency limit
      </span>
    </div>
  );
}

function RuleStatusDot({ disabled }: { disabled?: boolean }) {
  if (disabled) {
    return (
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400"
        aria-hidden="true"
      />
    );
  }
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
    </span>
  );
}

function RuleStatusIndicator({ rule }: { rule: LimitRule }) {
  return (
    <span className={ruleStatusPillStyles({ disabled: rule.disabled })}>
      <RuleStatusDot disabled={rule.disabled} />
      <span className={ruleStatusLabelStyles({ disabled: rule.disabled })}>
        {rule.disabled ? 'Disabled' : 'Enabled'}
      </span>
    </span>
  );
}

function RuleModified({ millis }: { millis: number }) {
  const durationSince = useDurationSinceLastSnapshot();
  const date = new Date(millis);
  const duration = formatDurations(durationSince(date));
  return (
    <span className="shrink-0 text-2xs whitespace-nowrap text-gray-500">
      modified{' '}
      <DateTooltip date={date} title="Last modified">
        <span className="font-medium text-gray-500">{duration}</span>
      </DateTooltip>{' '}
      ago
    </span>
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

// Usage chip: neutral — white fill, gray border, gray text. Same shape/height as
// the Depth badge.
function CapacityBadge({ count, pct }: { count: number; pct: number | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs leading-4 font-medium text-gray-600 tabular-nums">
      {formatNumber(count)}
      {pct != null && <span className="font-normal opacity-70">({pct}%)</span>}
    </span>
  );
}

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

function CounterDepthCell({ row }: { row: UserLimitRow }) {
  const depthRatio = counterDepthRatio(row);
  if (depthRatio <= 0) {
    return <span className={ruleNumberStyles({ muted: true })}>—</span>;
  }
  const { badgeBg, badgeBorder, text } = depthStatus(depthRatio);
  return (
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
  );
}

function CounterPendingCell({
  row,
  maxPending,
}: {
  row: UserLimitRow;
  maxPending: number;
}) {
  const pending = row.num_waiters ?? 0;
  if (pending <= 0) {
    return <span className={ruleNumberStyles({ muted: true })}>0</span>;
  }
  const { barFill, barBorder } = depthStatus(counterDepthRatio(row));
  const widthPercent = Math.max(4, (pending / Math.max(maxPending, 1)) * 100);
  return (
    <div className="flex w-full max-w-40 items-center gap-2 pr-2">
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
      <span className="min-w-5 shrink-0 text-right text-xs font-medium text-zinc-600 tabular-nums">
        {formatNumber(pending)}
      </span>
    </div>
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

function RuleHeaderActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <SplitButton
      mini={false}
      variant="secondary"
      className="h-[28.5px] text-[0.9375rem]"
      onSelect={(key) => {
        if (key === 'edit') onEdit();
        if (key === 'delete') onDelete();
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
        type="button"
        variant="secondary"
        onClick={onEdit}
        className="flex items-center rounded-l-lg rounded-r-none px-2.5 py-1 text-[0.9375rem]"
      >
        Edit
      </Button>
    </SplitButton>
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
  maxPending: number,
) {
  switch (column.id) {
    case 'key':
      return (
        <Cell>
          <PatternChip pattern={counterKey(row) || '—'} className="min-w-0" />
        </Cell>
      );
    case 'usage': {
      const limit = row.concurrency_limit;
      const usage = row.usage ?? 0;
      const pct =
        limit != null && limit > 0 ? Math.round((usage / limit) * 100) : null;
      return (
        <Cell>
          <CapacityBadge count={usage} pct={pct} />
        </Cell>
      );
    }
    case 'depth':
      return (
        <Cell>
          <CounterDepthCell row={row} />
        </Cell>
      );
    default:
      return (
        <Cell>
          <CounterPendingCell row={row} maxPending={maxPending} />
        </Cell>
      );
  }
}

function RulesHero() {
  return (
    <div className="flex flex-col gap-1.5 pr-2 pl-10">
      <div className="flex items-center gap-2">
        <Icon
          name={IconName.SlidersHorizontal}
          className="h-6 w-6 shrink-0 text-gray-400"
        />
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
      className="relative flex max-w-[22rem] min-w-0 flex-1 items-center"
    >
      <Label className="sr-only">Test a key against the rules</Label>
      <Icon
        name={IconName.Search}
        className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-gray-400"
      />
      <AriaInput
        placeholder="Test a key — e.g. acme/team"
        spellCheck={false}
        className="h-8 w-full rounded-xl border border-transparent bg-transparent pr-7 pl-8 font-mono text-xs text-gray-700 transition outline-none placeholder:font-sans placeholder:text-gray-400 hover:border-gray-200 hover:bg-gray-100 focus:border-gray-200 focus:bg-gray-100"
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
      return sortedRows.filter((row) =>
        keyAnalysis.applicable.has(row.pattern),
      );
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
                  icon={
                    trimmedQuery
                      ? IconName.ScanSearch
                      : IconName.SlidersHorizontal
                  }
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

const MATCH_QUERY_PARAM = 'match';
const TAB_QUERY_PARAM = 'tab';
const ALL_TAB = 'all';

function buildTabHref(params: URLSearchParams, tabId: string): string {
  const next = new URLSearchParams(params);
  if (tabId === ALL_TAB) next.delete(TAB_QUERY_PARAM);
  else next.set(TAB_QUERY_PARAM, tabId);
  const s = next.toString();
  return s ? `?${s}` : '?';
}

function buildOpenMatchHref(params: URLSearchParams, key: string): string {
  const next = new URLSearchParams(params);
  if (!next.getAll(MATCH_QUERY_PARAM).includes(key)) {
    next.append(MATCH_QUERY_PARAM, key);
  }
  next.set(TAB_QUERY_PARAM, key);
  return `?${next.toString()}`;
}

function buildCloseMatchHref(
  params: URLSearchParams,
  key: string,
  activeTab: string,
): string {
  const next = new URLSearchParams(params);
  const remaining = next.getAll(MATCH_QUERY_PARAM).filter((m) => m !== key);
  next.delete(MATCH_QUERY_PARAM);
  remaining.forEach((m) => next.append(MATCH_QUERY_PARAM, m));
  if (activeTab === key) next.delete(TAB_QUERY_PARAM);
  const s = next.toString();
  return s ? `?${s}` : '?';
}

// A match-tab key encodes the counter positionally: scope/l1/l2 (the same shape
// counterKey() builds), so it parses straight back into the targets filter.
function parseMatchKey(key: string): {
  scope?: string;
  l1?: string;
  l2?: string;
} {
  const [scope, l1, l2] = key.split('/');
  return { scope, l1, l2 };
}

type TargetColumn =
  | 'service'
  | 'scopeKey'
  | 'vqueueId'
  | 'status'
  | 'running'
  | 'inbox'
  | 'head'
  | 'lastActivity';

const TARGET_COLUMNS: PanelTableColumn<TargetColumn>[] = [
  {
    id: 'scopeKey',
    name: 'Scope / limit key',
    isRowHeader: true,
    defaultWidth: 240,
    minWidth: 180,
  },
  { id: 'vqueueId', name: 'Queue ID', defaultWidth: 170, minWidth: 130 },
  { id: 'service', name: 'Service', defaultWidth: 190, minWidth: 140 },
  { id: 'status', name: 'Status' },
  { id: 'running', name: 'Running', defaultWidth: 100, minWidth: 40 },
  { id: 'inbox', name: 'Inbox', defaultWidth: 100, minWidth: 40 },
  { id: 'head', name: 'Head', defaultWidth: 150 },
  { id: 'lastActivity', name: 'Last activity', defaultWidth: 130 },
];

function targetToVqueueStatus(row: LimitTargetRow): InvocationVqueue {
  const blockedResource =
    (row.blocked_on === 'concurrency_rules' ||
      row.blocked_on === 'limit-key-concurrency') &&
    (row.blocked_rule || row.blocked_level || row.limit_key)
      ? {
          resource: 'limit-key-concurrency' as const,
          ...(row.blocked_rule ? { blockedRule: row.blocked_rule } : {}),
          ...(row.blocked_level
            ? {
                blockedLevel: row.blocked_level as
                  | 'scope'
                  | 'level1'
                  | 'level2',
              }
            : {}),
          ...(row.limit_key ? { limitKey: row.limit_key } : {}),
        }
      : undefined;
  const nowBlocks: { gate: string; duration: string }[] = [];
  for (const gate of [
    'concurrency_rules',
    'throttling_rules',
    'invoker_concurrency',
    'invoker_throttling',
    'invoker_memory',
    'lock',
    'deployment_concurrency',
  ] as const) {
    const duration = row[`${gate}_block_duration`];
    if (typeof duration === 'string' && duration) {
      nowBlocks.push({ gate, duration });
    }
  }
  return {
    supported: true,
    identity: { isPaused: Boolean(row.queue_is_paused) },
    status: {
      blocked: row.status === 'blocked' || Boolean(row.blocked_on),
      ...(row.status
        ? {
            scheduling: row.status as
              | 'dormant'
              | 'empty'
              | 'ready'
              | 'scheduled'
              | 'blocked',
          }
        : {}),
      ...(row.blocked_on ? { blockedOn: row.blocked_on } : {}),
      ...(blockedResource ? { blockedResource } : {}),
    },
    counts: {
      inbox: row.num_inbox ?? 0,
      running: row.num_running ?? 0,
      suspended: row.num_suspended ?? 0,
      paused: row.num_paused ?? 0,
    },
    head: { nowBlocks },
  };
}

function TargetStatusCell({ row }: { row: LimitTargetRow }) {
  return <VqueueStatus data={targetToVqueueStatus(row)} />;
}

function TargetLastActivityCell({ row }: { row: LimitTargetRow }) {
  const durationSince = useDurationSinceLastSnapshot();
  const ts = row.last_finish_at || row.last_attempt_at || row.last_enqueued_at;
  if (!ts) return <span className="text-2xs text-zinc-300">—</span>;
  const date = new Date(ts);
  return (
    <span className="text-2xs text-gray-500">
      <DateTooltip date={date} title="Last activity">
        <span className="font-medium">
          {formatDurations(durationSince(date))}
        </span>
      </DateTooltip>{' '}
      ago
    </span>
  );
}

function renderTargetCell(
  row: LimitTargetRow,
  column: PanelTableColumn<TargetColumn>,
  scope: string | undefined,
  matchKey: string,
) {
  switch (column.id) {
    case 'service':
      return (
        <Cell>
          <Target
            target={row.service_name}
            showHandler={false}
            className="h-6 [&_[data-target]]:h-6"
          />
        </Cell>
      );
    case 'scopeKey': {
      const pattern = [scope, row.limit_key].filter(Boolean).join('/');
      return (
        <Cell>
          {pattern ? (
            <PatternChip
              pattern={pattern}
              active={matchKey}
              className="min-w-0"
            />
          ) : (
            <span className="text-2xs text-zinc-300">—</span>
          )}
        </Cell>
      );
    }
    case 'vqueueId':
      return (
        <Cell>
          <Popover>
            <PopoverTrigger>
              <Button
                variant="secondary"
                className="flex min-w-0 items-center gap-1 rounded-md border-none bg-transparent p-0.5 shadow-none hover:bg-black/4"
              >
                <VqueueId id={row.id} showCopy={false} className="min-w-0" />
                <Icon
                  name={IconName.ChevronsUpDown}
                  className="h-3 w-3 shrink-0 text-gray-400"
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[64rem] max-w-[96vw]">
              <div className="p-2">
                <Vqueue vqueueId={row.id} />
              </div>
            </PopoverContent>
          </Popover>
        </Cell>
      );
    case 'status':
      return (
        <Cell>
          <TargetStatusCell row={row} />
        </Cell>
      );
    case 'running': {
      const n = row.num_running ?? 0;
      return (
        <Cell>
          {n > 0 ? (
            <Badge variant="info" size="sm" className="tabular-nums">
              <Ellipsis>{formatNumber(n)}</Ellipsis>
            </Badge>
          ) : (
            <span className={ruleNumberStyles({ muted: true })}>0</span>
          )}
        </Cell>
      );
    }
    case 'inbox': {
      const n = row.num_inbox ?? 0;
      return (
        <Cell>
          {n > 0 ? (
            <Badge variant="default" size="sm" className="tabular-nums">
              {formatNumber(n)}
            </Badge>
          ) : (
            <span className={ruleNumberStyles({ muted: true })}>0</span>
          )}
        </Cell>
      );
    }
    case 'lastActivity':
      return (
        <Cell>
          <TargetLastActivityCell row={row} />
        </Cell>
      );
    default:
      return (
        <Cell>
          {row.head_entry_id ? (
            <InvocationId id={row.head_entry_id} />
          ) : (
            <span className="text-2xs text-zinc-300">—</span>
          )}
        </Cell>
      );
  }
}

function TargetsTable({
  matchKey,
  params,
}: {
  matchKey: string;
  params: ReturnType<typeof useLimitsParameters>;
}) {
  const { scope, l1, l2 } = parseMatchKey(matchKey);
  const targets = useListLimitTargets({
    scope,
    l1,
    l2,
    filters: params.filters,
    sort: params.sort,
  });
  const rows = targets.data?.targets ?? [];
  return (
    <SnapshotTimeProvider lastSnapshot={targets.dataUpdatedAt}>
      <PanelTable
        aria-label={`Targets for ${matchKey}`}
        columns={TARGET_COLUMNS}
        items={rows}
        caption={
          <LimitsInfoBanner>
            The queues below all compete for{' '}
            <span className="font-mono font-medium text-gray-800">
              {matchKey}
            </span>
            ’s limit.
          </LimitsInfoBanner>
        }
        isLoading={targets.isPending}
        error={targets.error as Error | null}
        emptyPlaceholder={
          <EmptyState
            icon={IconName.Radio}
            title="No targets"
            description="This match has no active virtual queues."
          />
        }
        renderCell={(row, column) =>
          renderTargetCell(
            row as LimitTargetRow,
            column as PanelTableColumn<TargetColumn>,
            scope,
            matchKey,
          )
        }
      />
    </SnapshotTimeProvider>
  );
}

function MatchTabLabel({
  matchKey,
  usage,
  limit,
  onClose,
}: {
  matchKey: string;
  usage?: number | null;
  limit?: number | null;
  onClose: () => void;
}) {
  const pct =
    usage != null && limit != null && limit > 0
      ? Math.round((usage / limit) * 100)
      : null;
  // The close affordance is a span (not a button): a tab also renders inside the
  // MobileTabsDropdown's trigger <button>, and a nested <button> is invalid HTML.
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon name={IconName.Gauge} className="h-4 w-4 fill-none! opacity-60" />
      <span className="font-mono">{matchKey}</span>
      {usage != null && <CapacityBadge count={usage} pct={pct} />}
      <span
        role="button"
        tabIndex={0}
        aria-label={`Close ${matchKey}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }
        }}
        className="-mr-1 flex h-4 w-4 cursor-default items-center justify-center rounded text-gray-400 hover:bg-black/5 hover:text-gray-600"
      >
        <Icon name={IconName.X} className="h-3 w-3" />
      </span>
    </span>
  );
}

// A subtle info strip explaining what the table's rows represent. Rendered into
// PanelTable's `caption` slot, so it sits below the sticky column header and
// scrolls with the rows. `mt-9` clears the floating header overlap.
function LimitsInfoBanner({ children }: { children: ReactNode }) {
  return (
    <div className="mx-2 mt-11 -mb-9 flex items-start gap-2 rounded-xl border border-blue-200/60 bg-blue-50/50 px-3 py-2">
      <Icon
        name={IconName.Info}
        className="mt-px h-4 w-4 shrink-0 text-blue-500/80"
      />
      <p className="text-xs leading-relaxed text-gray-600">{children}</p>
    </div>
  );
}

function RuleDetailComponent() {
  const { flagEnabled, hasVqueues } = useLimitsAccess();
  const { baseUrl } = useRestateContext();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const pattern = params.pattern;
  const enabled = flagEnabled && hasVqueues && Boolean(pattern);

  const ruleQuery = useGetLimitRule(pattern, { enabled });
  const counterParams = useLimitsParameters(
    'counter',
    COUNTER_SCHEMA,
    COUNTER_DEFAULT_SORT,
  );
  const counters = useListLimitCounters(pattern, counterParams, { enabled });
  const targetParams = useLimitsParameters(
    'target',
    TARGET_SCHEMA,
    TARGET_DEFAULT_SORT,
  );

  const [isEditOpen, setEditOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);

  const rule = ruleQuery.data;
  const counterRows = useMemo(
    () => toCounterRows(counters.data?.limits ?? []),
    [counters.data?.limits],
  );
  const maxPending = useMemo(
    () =>
      counterRows.reduce((max, row) => Math.max(max, row.num_waiters ?? 0), 0),
    [counterRows],
  );

  if (!flagEnabled) return <LimitsUnavailable reason="flag" />;
  if (!hasVqueues) return <LimitsUnavailable reason="cluster" />;
  if (!pattern) {
    return (
      <EmptyState
        icon={IconName.SlidersHorizontal}
        title="No rule selected"
        description="Open a configured rule to inspect its active limits."
      >
        <Link href={`${baseUrl}/limits/rules`} variant="secondary-button">
          Back to rules
        </Link>
      </EmptyState>
    );
  }

  if (ruleQuery.error && !rule) {
    return (
      <div className="flex min-h-0 flex-1 flex-col pt-4">
        <RuleBreadcrumb pattern={pattern} />
        <EmptyState
          icon={IconName.ScanSearch}
          intent="neutral"
          title="This rule could not be loaded"
          description="The rule may have been deleted or changed."
        >
          <ErrorBanner
            error={ruleQuery.error as Error}
            className="rounded-xl"
          />
          <Link href={`${baseUrl}/limits/rules`} variant="secondary-button">
            Back to rules
          </Link>
        </EmptyState>
      </div>
    );
  }

  const matches = searchParams.getAll(MATCH_QUERY_PARAM);
  const activeTab = searchParams.get(TAB_QUERY_PARAM) ?? ALL_TAB;
  const isAllTab = activeTab === ALL_TAB;

  return (
    <div className="flex min-h-0 flex-1 flex-col pt-4 [--cp-toolbar-top:5rem] [--cp-toolbar-tuck:5rem]">
      <RuleBreadcrumb pattern={pattern} />
      <SnapshotTimeProvider lastSnapshot={ruleQuery.dataUpdatedAt}>
        <div className={ruleHeaderStyles({ disabled: rule?.disabled })}>
          <PatternChip
            pattern={pattern}
            disabled={rule?.disabled}
            radius="lg"
            isRule
            className="h-[1.875rem] p-0.5 text-sm mix-blend-luminosity"
          />
          {rule && <RuleStatus rule={rule} />}
          {rule && (
            <RuleModified millis={rule.last_modified_millis_since_epoch} />
          )}
          {rule && (
            <div className="ml-auto flex shrink-0 items-center gap-3">
              <RuleStatusIndicator rule={rule} />
              <RuleHeaderActions
                onEdit={() => setEditOpen(true)}
                onDelete={() => setDeleteOpen(true)}
              />
            </div>
          )}
        </div>
      </SnapshotTimeProvider>
      {rule && (
        <div className="relative z-10 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-5 pt-2 pl-8 text-sm text-gray-500">
          <span className="min-w-0">
            {rule.description || 'No description'}
          </span>
          <span className="text-gray-300">·</span>
          <span className="whitespace-nowrap text-gray-400">
            v{formatNumber(rule.version)}
          </span>
        </div>
      )}
      <ContentPanel
        className="-mt-12"
        tabs={{
          items: [
            { id: ALL_TAB, label: 'Counters' },
            ...matches.map((m) => {
              const counter = counterRows.find((r) => counterKey(r) === m);
              return {
                id: m,
                label: (
                  <MatchTabLabel
                    matchKey={m}
                    usage={counter?.usage}
                    limit={counter?.concurrency_limit}
                    onClose={() =>
                      navigate(buildCloseMatchHref(searchParams, m, activeTab))
                    }
                  />
                ),
              };
            }),
          ],
          selectedId: activeTab,
          onSelect: (id) => navigate(buildTabHref(searchParams, id)),
        }}
      >
        <ContentPanelBody className="pb-24">
          <ContentPanelSection flush>
            {isAllTab ? (
              <PanelTable
                aria-label="Counters for rule"
                columns={COUNTER_COLUMNS}
                items={counterRows}
                caption={
                  rule?.limits.concurrency != null ? (
                    <LimitsInfoBanner>
                      The counters below each get their own limit of{' '}
                      <span className="font-semibold text-gray-800">
                        {formatNumber(rule.limits.concurrency)}
                      </span>{' '}
                      — not {formatNumber(rule.limits.concurrency)} shared
                      across all.
                    </LimitsInfoBanner>
                  ) : undefined
                }
                isLoading={counters.isPending}
                error={counters.error as Error | null}
                emptyPlaceholder={
                  <EmptyState
                    icon={IconName.Radio}
                    title="No active counter"
                    description="This rule is configured, but no active limits currently resolve to it."
                  />
                }
                renderCell={(row, column) =>
                  renderCounterCell(
                    row,
                    column as PanelTableColumn<CounterColumn>,
                    maxPending,
                  )
                }
                onRowAction={(key) => {
                  const row = counterRows.find((r) => r.id === key);
                  if (row) {
                    navigate(buildOpenMatchHref(searchParams, counterKey(row)));
                  }
                }}
              />
            ) : (
              <TargetsTable
                matchKey={activeTab}
                params={targetParams}
                key={activeTab}
              />
            )}
          </ContentPanelSection>
        </ContentPanelBody>
      </ContentPanel>
      <LayoutOutlet zone={LayoutZone.Toolbar}>
        {isAllTab ? (
          <LimitsQueryBar
            key={`counter:${getLimitsFormSignature(searchParams, 'counter')}`}
            kind="counter"
            schema={COUNTER_SCHEMA}
            sorts={COUNTER_SORTS}
            presets={COUNTER_PRESETS}
            defaultSort={COUNTER_DEFAULT_SORT}
            placeholder="Filter counters…"
            isFetching={counters.isFetching}
            queryKey={counters.queryKey}
          />
        ) : (
          <LimitsQueryBar
            key={`target:${activeTab}:${getLimitsFormSignature(searchParams, 'target')}`}
            kind="target"
            schema={TARGET_SCHEMA}
            sorts={TARGET_SORTS}
            presets={TARGET_PRESETS}
            defaultSort={TARGET_DEFAULT_SORT}
            placeholder="Filter targets…"
            queryKey={['/query/limits/targets']}
          />
        )}
      </LayoutOutlet>
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
          <Icon
            name={IconName.SlidersHorizontal}
            className="h-4 w-4 text-blue-500"
          />
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
  const formId = useId();
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
        <form id={formId} className="flex flex-col gap-5" onSubmit={submit}>
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
                  : 'Match invocations by scope and a limit key, then cap their concurrency.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-700">Pattern</span>
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

          <div className="grid gap-3 md:grid-cols-[10rem_minmax(0,1fr)_auto]">
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
            <div className="flex flex-col">
              <span className="mb-1.5 text-sm font-medium text-gray-700">
                Enabled
              </span>
              <div className="flex min-h-8.5 items-center">
                <Switch
                  isSelected={enabled}
                  onChange={setEnabled}
                  aria-label="Enabled"
                />
              </div>
            </div>
          </div>

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
                  form={formId}
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

export const limits = { Component: LimitsListComponent };
export const limitRule = { Component: RuleDetailComponent };
