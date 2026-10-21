import {
  type LimitRuleWithStats,
  useDeleteLimitRule,
  useListLimitRules,
  useUpdateLimitRule,
} from '@restate/data-access-admin-api-hooks';
import {
  CREATE_LIMIT_RULE_QUERY_PARAM,
  type EditableLimitRule,
  LimitRuleTarget,
  LimitValue,
  RULE_LEVEL_COLUMN_WIDTH,
  RuleFormDialog,
  RuleLevelExplainer,
  RuleLevelValue,
  getRuleLevel,
  type RuleLevel,
} from '@restate/features-vqueue-ui';
import { useRestateContext } from '@restate/features-restate-context';
import { Badge } from '@restate/ui-badge';
import { Button } from '@restate/ui-button';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui-content-panel';
import { ConfirmationDialog } from '@restate/ui-dialog';
import { DropdownItem } from '@restate/ui-dropdown';
import { EmptyState } from '@restate/ui-empty-state';
import {
  AddFilterTrigger,
  FilterBuilder,
  FilterChip,
  FilteredResultsCaption,
  QueryClause,
  QueryClauseOption,
  QueryClauseType,
  readFilterClauses,
  useFilterBuilder,
  writeFilterClauses,
} from '@restate/ui-filter-builder';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { SplitButton } from '@restate/ui-split-button';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui-table';
import {
  InlineTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TruncateWithTooltip,
} from '@restate/ui-tooltip';
import { formatNumber } from '@restate/util-intl';
import { tv } from '@restate/util-styles';
import { type QueryKey, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Form, useNavigate, useSearchParams } from 'react-router';
import { type SortDescriptor } from 'react-aria-components';
import { limitCountersForRuleHref } from './navigation';
import { LIMIT_LIST_QUERY_SIZE } from './limits.constants';
import { LimitListTruncation } from './LimitListTruncation';
import { FlowControlHeader, flowControlTabs } from './FlowControlPage';
import {
  LimitRuleFilterOption,
  LimitRuleFilterValue,
} from './LimitRuleFilterValue';
import {
  limitRuleFilterSchema,
  selectedLimitRulePattern,
} from './limits.ruleFilters';

type RuleColumn =
  | 'pattern'
  | 'level'
  | 'limit'
  | 'counters'
  | 'description'
  | 'enabled'
  | 'actions';

interface RuleRow extends LimitRuleWithStats {
  id: string;
  href: string;
  level: RuleLevel;
}

const RULE_COLUMNS: PanelTableColumn<RuleColumn>[] = [
  {
    id: 'pattern',
    name: 'Pattern',
    isRowHeader: true,
    allowsSorting: true,
    defaultWidth: '4fr',
  },
  {
    id: 'level',
    name: <RuleLevelExplainer />,
    width: RULE_LEVEL_COLUMN_WIDTH,
  },
  {
    id: 'limit',
    name: 'Limit',
    defaultWidth: '2fr',
    maxWidth: 160,
  },
  {
    id: 'counters',
    name: <CounterSummaryExplainer />,
    defaultWidth: '3fr',
    maxWidth: 250,
  },
  {
    id: 'description',
    name: 'Description',
    defaultWidth: '4fr',
  },
  {
    id: 'enabled',
    name: 'Status',
    width: 100,
  },
  { id: 'actions', name: 'Actions', hideLabel: true, width: 40 },
];

function CounterSummaryExplainer() {
  return (
    <InlineTooltip
      variant="indicator-button"
      title="Limit counters"
      ariaLabel="Explain backlogged limit counters"
      description={
        <p className="max-w-72 text-xs leading-4 text-faint">
          A backlogged limit counter currently has at least one VQueue waiting
          for capacity. The ratio compares backlogged limit counters with all
          concrete limit counters governed by this rule.
        </p>
      }
    >
      Backlogged / total
    </InlineTooltip>
  );
}

const counterValueStyles = tv({
  variants: {
    hasWaiters: {
      true: 'text-pending-strong',
      false: 'text-faint',
    },
  },
});

const refreshIconStyles = tv({
  base: 'h-3.5 w-3.5',
  variants: {
    isFetching: {
      true: 'animate-spin',
    },
  },
});

const ruleActionButtonStyles = tv({
  base: 'flex translate-x-px items-center gap-1 rounded-r-none whitespace-nowrap text-tertiary',
  variants: {
    alwaysVisible: {
      true: 'rounded-l-lg px-2 py-0.5 [font-size:inherit] [line-height:inherit] max-md:hidden',
      false:
        'invisible absolute right-full z-2 rounded-l-md px-2.5 py-0.5 text-0.5xs drop-shadow-[-20px_2px_4px_--theme(--background-color-muted/50%)] group-hover:visible',
    },
  },
  defaultVariants: { alwaysVisible: false },
});

const ruleActionGroupStyles = tv({
  variants: {
    inline: {
      true: 'rounded-l-lg text-[0.9375rem]',
      false: '',
    },
  },
});

const ruleActionSplitStyles = tv({
  variants: {
    inline: {
      true: 'rounded-lg md:rounded-l-none',
      false: '',
    },
  },
});

function CounterSummaryCell({
  total,
  withWaiters,
  href,
}: {
  total: number;
  withWaiters: number;
  href: string;
}) {
  const affected = Math.min(withWaiters, total);
  const percentage = total > 0 ? (affected / total) * 100 : 0;
  const label = `${formatNumber(affected)} of ${formatNumber(total)} limit counters have waiting VQueues`;

  return (
    <Link
      href={href}
      aria-label={`${label}. View matching limit counters`}
      className="flex w-full max-w-48 items-center gap-2 no-underline"
    >
      <div className="flex h-3 min-w-0 flex-1 overflow-hidden rounded-lg border border-default bg-muted p-0.5">
        {affected > 0 && (
          <div
            className="h-full rounded-full bg-pending-emphasis outline-1 outline-pending-strong transition-all"
            style={{ width: `${percentage}%`, minWidth: 2 }}
          />
        )}
      </div>
      <span
        aria-hidden="true"
        className="flex min-w-12 shrink-0 items-baseline justify-end gap-1 text-xs font-medium tabular-nums"
      >
        <span className={counterValueStyles({ hasWaiters: affected > 0 })}>
          {formatNumber(affected)}
        </span>
        <span className="text-faint">/</span>
        <span className="text-muted">{formatNumber(total)}</span>
      </span>
      <Icon
        name={IconName.ChevronRight}
        className="mr-1 h-3 w-3 shrink-0 text-subtle"
      />
    </Link>
  );
}

function RuleStatusBadge({ disabled }: { disabled: boolean }) {
  return (
    <Badge size="sm" variant={disabled ? 'default' : 'info'}>
      {disabled ? 'Disabled' : 'Enabled'}
    </Badge>
  );
}

export function RuleActions({
  rule,
  onToggle,
  onEdit,
  onDelete,
  alwaysShowPrimary,
}: {
  rule: EditableLimitRule;
  onToggle: (rule: EditableLimitRule) => void;
  onEdit: (rule: EditableLimitRule) => void;
  onDelete: (rule: EditableLimitRule) => void;
  alwaysShowPrimary?: boolean;
}) {
  const enabled = !rule.disabled;
  return (
    <div className="flex justify-end">
      <SplitButton
        mini={alwaysShowPrimary ? 'md' : true}
        className={ruleActionGroupStyles({ inline: alwaysShowPrimary })}
        splitClassName={ruleActionSplitStyles({ inline: alwaysShowPrimary })}
        onSelect={(action) => {
          if (action === 'toggle') {
            onToggle(rule);
          }
          if (action === 'edit') onEdit(rule);
          if (action === 'delete') onDelete(rule);
        }}
        menus={[
          <DropdownItem key="toggle" value="toggle">
            <Icon
              name={enabled ? IconName.Pause : IconName.Play}
              className="h-3.5 w-3.5 shrink-0 opacity-80"
            />
            {enabled ? 'Disable rule' : 'Enable rule'}
          </DropdownItem>,
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
          className={ruleActionButtonStyles({
            alwaysVisible: alwaysShowPrimary,
          })}
        >
          Edit
        </Button>
      </SplitButton>
    </div>
  );
}

function renderRuleCell(
  row: RuleRow,
  column: PanelTableColumn<RuleColumn>,
  onToggle: (rule: EditableLimitRule) => void,
  onEdit: (rule: EditableLimitRule) => void,
  onDelete: (rule: EditableLimitRule) => void,
) {
  switch (column.id) {
    case 'pattern':
      return (
        <Cell className="overflow-visible">
          <LimitRuleTarget
            pattern={row.pattern}
            href={row.href}
            variant="table"
          />
        </Cell>
      );
    case 'level':
      return (
        <Cell>
          <RuleLevelValue level={row.level} />
        </Cell>
      );
    case 'limit':
      return (
        <Cell>
          <LimitValue value={row.limits.concurrency} disabled={row.disabled} />
        </Cell>
      );
    case 'counters':
      return (
        <Cell>
          <CounterSummaryCell
            total={row.num_counters}
            withWaiters={row.num_counters_with_waiters}
            href={row.href}
          />
        </Cell>
      );
    case 'description':
      return (
        <Cell>
          {row.description ? (
            <TruncateWithTooltip hideCopy tooltipContent={row.description}>
              {row.description}
            </TruncateWithTooltip>
          ) : (
            <span className="text-subtle">No description</span>
          )}
        </Cell>
      );
    case 'enabled':
      return (
        <Cell>
          <RuleStatusBadge disabled={row.disabled} />
        </Cell>
      );
    case 'actions':
      return (
        <Cell className="[&&&]:overflow-visible">
          <RuleActions
            rule={row}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </Cell>
      );
  }
}

export function DeleteRuleDialog({
  rule,
  onOpenChange,
  onDeleted,
}: {
  rule: EditableLimitRule;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const mutation = useDeleteLimitRule();
  return (
    <ConfirmationDialog
      open
      onOpenChange={onOpenChange}
      title="Delete limit rule"
      icon={IconName.Trash}
      iconClassName="text-danger"
      description={
        <span className="flex flex-col items-start gap-1.5">
          <span className="flex items-center gap-1.5">
            Delete <LimitRuleTarget pattern={rule.pattern} />?
          </span>
          <span>Invocations will no longer be constrained by this rule.</span>
        </span>
      }
      submitText="Delete"
      closeText="Cancel"
      submitVariant="destructive"
      formMethod="POST"
      formAction="/limits/rules/bulk-delete"
      isPending={mutation.isPending}
      error={mutation.error as Error | null}
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate(
          {
            pattern: rule.pattern,
            expected_version: rule.version,
          },
          {
            onSuccess: () => {
              onOpenChange(false);
              onDeleted?.();
            },
          },
        );
      }}
    />
  );
}

type LimitRulesQueryData = {
  rules: LimitRuleWithStats[];
  hasMore: boolean;
} | null;

function setRuleDisabled(
  data: LimitRulesQueryData | undefined,
  pattern: string,
  disabled: boolean,
) {
  if (!data) return data;
  return {
    ...data,
    rules: data.rules.map((rule) =>
      rule.pattern === pattern ? { ...rule, disabled } : rule,
    ),
  };
}

function ToggleRuleDialog({
  rule,
  queryKey,
  onOpenChange,
}: {
  rule: EditableLimitRule;
  queryKey: QueryKey;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useUpdateLimitRule();
  const nextDisabled = !rule.disabled;
  const action = nextDisabled ? 'Disable' : 'Enable';

  return (
    <ConfirmationDialog
      open
      onOpenChange={onOpenChange}
      title={`${action} limit rule`}
      icon={nextDisabled ? IconName.Pause : IconName.Play}
      description={
        <span className="flex flex-col items-start gap-1.5">
          <span className="flex items-center gap-1.5">
            {action} <LimitRuleTarget pattern={rule.pattern} />?
          </span>
          <span>
            {nextDisabled
              ? 'Matching invocations will no longer be constrained by this rule.'
              : 'Matching invocations will be constrained by this rule.'}
          </span>
        </span>
      }
      submitText={action}
      closeText="Cancel"
      formMethod="PUT"
      formAction="/limits/rules"
      isPending={mutation.isPending}
      isSubmitDisabled={mutation.isPending}
      error={mutation.error as Error | null}
      onSubmit={async (event) => {
        event.preventDefault();
        await queryClient.cancelQueries({ queryKey, exact: true });
        const previous =
          queryClient.getQueryData<LimitRulesQueryData>(queryKey);
        queryClient.setQueryData<LimitRulesQueryData>(queryKey, (data) =>
          setRuleDisabled(data, rule.pattern, nextDisabled),
        );
        mutation.mutate(
          {
            pattern: rule.pattern,
            description: rule.description ?? null,
            disabled: nextDisabled,
            limits: rule.limits,
            version: rule.version,
          },
          {
            onError: () => queryClient.setQueryData(queryKey, previous),
            onSuccess: () => onOpenChange(false),
          },
        );
      }}
    />
  );
}

const RULE_OPTIONS_REQUEST = {
  sort: { field: 'pattern' as const, order: 'ASC' as const },
  limit: LIMIT_LIST_QUERY_SIZE,
};

function Component() {
  const { baseUrl } = useRestateContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchString = searchParams.toString();
  const ruleOptionsQuery = useListLimitRules(RULE_OPTIONS_REQUEST);
  const ruleOptions = ruleOptionsQuery.data?.rules ?? [];
  const filterSchema = useMemo(
    () => limitRuleFilterSchema(ruleOptions),
    [ruleOptions],
  );
  const committedFilters = useMemo(
    () => readFilterClauses(new URLSearchParams(searchString), [filterSchema]),
    [filterSchema, searchString],
  );
  const selectedPattern = selectedLimitRulePattern(committedFilters);
  const filterQuery = useFilterBuilder(
    committedFilters,
    ruleOptionsQuery.isLoading,
  );
  const formRef = useRef<HTMLFormElement | null>(null);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Removing a filter updates the list before this callback runs, but the
  // current render still exposes the old items. Defer submission until React
  // commits the removal so the URL is written from the updated list.
  // TODO: Have FilterBuilder provide the next items and remove this timer.
  const scheduleSubmit = useCallback(() => {
    clearTimeout(submitTimerRef.current);
    submitTimerRef.current = setTimeout(
      () => formRef.current?.requestSubmit(),
      0,
    );
  }, []);
  const [sortDescriptor, setSortDescriptor] = useState<
    SortDescriptor | undefined
  >({
    column: 'pattern',
    direction: 'ascending',
  });
  const ruleRequest = useMemo(
    () => ({
      ...(sortDescriptor && {
        sort: {
          field: 'pattern' as const,
          order: sortDescriptor.direction === 'ascending' ? 'ASC' : 'DESC',
        } as const,
      }),
      ...(selectedPattern ? { rulePattern: selectedPattern } : {}),
      limit: LIMIT_LIST_QUERY_SIZE,
    }),
    [selectedPattern, sortDescriptor],
  );
  const rules = useListLimitRules(ruleRequest);
  const [editingRule, setEditingRule] = useState<EditableLimitRule | null>(
    null,
  );
  const [togglingRule, setTogglingRule] = useState<EditableLimitRule | null>(
    null,
  );
  const [deletingRule, setDeletingRule] = useState<EditableLimitRule | null>(
    null,
  );

  const rows = useMemo<RuleRow[]>(() => {
    return (rules.data?.rules ?? []).map((rule) => {
      return {
        ...rule,
        id: rule.pattern,
        href: limitCountersForRuleHref(baseUrl, rule.pattern),
        level: getRuleLevel(rule.pattern),
      };
    });
  }, [baseUrl, rules.data?.rules]);
  const ruleTableBodyKey = `${rules.isFetching ? 'loading' : 'ready'}:${rows
    .map((row) => row.id)
    .join(':')}`;

  const error = rules.error;
  const renderRuleValue = useCallback((item: QueryClause<QueryClauseType>) => {
    const pattern =
      typeof item.value.value === 'string' ? item.value.value : '';
    return pattern ? <LimitRuleFilterValue pattern={pattern} /> : null;
  }, []);
  const renderRuleOption = useCallback(
    (option: QueryClauseOption) => {
      const rule = ruleOptions.find(
        (candidate) => candidate.pattern === option.value,
      );
      return rule ? <LimitRuleFilterOption rule={rule} /> : option.label;
    },
    [ruleOptions],
  );
  const isFetching = rules.isFetching || ruleOptionsQuery.isFetching;
  const pageToolbar = (
    <>
      <Form
        ref={formRef}
        className="hidden min-w-0 flex-auto sm:block"
        onSubmit={(event) => {
          event.preventDefault();
          setSearchParams(writeFilterClauses(searchParams, filterQuery.items), {
            preventScrollReset: true,
          });
        }}
      >
        <FilterBuilder query={filterQuery} schema={[filterSchema]} multiple>
          <AddFilterTrigger
            placeholder="Filter rules…"
            title="Rule filters"
            onItemRemove={scheduleSubmit}
            inputPrefix={
              <Icon
                name={IconName.Search}
                className="h-4 w-4 shrink-0 text-subtle"
              />
            }
            tagsPlacement="outside"
            maxVisibleChips="auto"
            chipOverflowStrategy="all"
            tagGroupClassName="min-w-0 flex-nowrap"
            showSectionTitle={false}
            popoverPlacement="bottom start"
            popoverClassName="w-80 min-w-80 max-w-[calc(100vw-2rem)] bg-surface/95 p-1"
            optionClassName="gap-2 px-2.5 py-1.5 data-[focused]:bg-accent-subtle data-[focused]:text-accent-strong hover:bg-accent-subtle hover:text-accent-strong"
            className="min-h-6.5 w-full justify-end text-primary"
            inputClassName="min-h-6.5 max-w-[38ch] flex-[0_1_38ch] bg-surface/70 shadow-xs hover:bg-surface [&_input]:h-6 [&_input]:min-h-6 [&_input]:py-0.5 [&_input]:placeholder:text-subtle"
          >
            {(props) => (
              <FilterChip
                {...props}
                appearance="light"
                showRemove
                popoverPlacement="bottom"
                valueClassName="max-w-56"
                popoverClassName="w-[32rem] max-w-[calc(100vw-2rem)]"
                renderValue={renderRuleValue}
                renderOption={renderRuleOption}
              />
            )}
          </AddFilterTrigger>
        </FilterBuilder>
      </Form>
      <Button
        type="button"
        variant="primary"
        className="flex h-6.5 shrink-0 items-center justify-center gap-2 rounded-lg py-0 pr-2 pl-1.5 text-0.5xs [&_svg]:h-3.5 [&_svg]:w-3.5"
        onClick={() =>
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.set(CREATE_LIMIT_RULE_QUERY_PARAM, 'true');
              return next;
            },
            { preventScrollReset: true },
          )
        }
      >
        <Icon name={IconName.Plus} />
        New rule
      </Button>
      <Tooltip>
        <TooltipTrigger>
          <Button
            type="button"
            variant="icon"
            aria-label={isFetching ? 'Refreshing rules' : 'Refresh rules'}
            className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg p-0"
            onClick={() => {
              void rules.refetch();
              void ruleOptionsQuery.refetch();
            }}
            disabled={isFetching}
          >
            <Icon
              name={IconName.Retry}
              className={refreshIconStyles({
                isFetching,
              })}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent size="sm">Refresh rules</TooltipContent>
      </Tooltip>
    </>
  );
  const filteredResultsCaption = selectedPattern ? (
    <FilteredResultsCaption
      noun="rules"
      onClear={() =>
        setSearchParams(writeFilterClauses(searchParams, []), {
          preventScrollReset: true,
        })
      }
    />
  ) : undefined;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <FlowControlHeader />
      <ContentPanel tabs={flowControlTabs(baseUrl, 'rules')}>
        <ContentPanelToolbar>{pageToolbar}</ContentPanelToolbar>
        <ContentPanelBody className="pb-32">
          <ContentPanelSection flush>
            <PanelTable
              aria-label="Limit rules"
              bodyKey={ruleTableBodyKey}
              columns={RULE_COLUMNS}
              items={rows}
              isLoading={rules.isFetching}
              error={error as Error | null}
              numOfRows={Math.max(rows.length, 6)}
              bodyDependencies={[error, rules.isFetching]}
              caption={filteredResultsCaption}
              sortDescriptor={sortDescriptor}
              onSortChange={setSortDescriptor}
              emptyPlaceholder={
                <EmptyState
                  icon={IconName.Filters}
                  title={
                    selectedPattern ? 'No matching rules' : 'No limit rules'
                  }
                  description={
                    selectedPattern
                      ? 'No configured rule matches the selected pattern.'
                      : 'Create a rule to configure concurrency capacity.'
                  }
                />
              }
              renderCell={(row, column) =>
                renderRuleCell(
                  row,
                  column,
                  setTogglingRule,
                  setEditingRule,
                  setDeletingRule,
                )
              }
              onRowAction={(key) => {
                const row = rows.find((item) => item.id === String(key));
                if (row) navigate(row.href);
              }}
              rowClassName="transition-none [content-visibility:auto]"
            />
            {!rules.isFetching && (
              <LimitListTruncation
                hasMore={Boolean(rules.data?.hasMore)}
                totalItems={rows.length}
                label="rules"
              />
            )}
          </ContentPanelSection>
        </ContentPanelBody>
      </ContentPanel>

      {editingRule && (
        <RuleFormDialog
          rule={editingRule}
          onOpenChange={(open) => {
            if (!open) setEditingRule(null);
          }}
        />
      )}
      {togglingRule && (
        <ToggleRuleDialog
          rule={togglingRule}
          queryKey={rules.queryKey}
          onOpenChange={(open) => {
            if (!open) setTogglingRule(null);
          }}
        />
      )}
      {deletingRule && (
        <DeleteRuleDialog
          rule={deletingRule}
          onOpenChange={(open) => {
            if (!open) setDeletingRule(null);
          }}
        />
      )}
    </div>
  );
}

export const limits = { Component };
