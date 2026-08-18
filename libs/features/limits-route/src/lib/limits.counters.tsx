import { useFeatures } from '@restate/data-access/admin-api';
import {
  useListLimitRules,
  useListUserLimits,
} from '@restate/data-access/admin-api-hooks';
import type { components } from '@restate/data-access/admin-api-spec';
import { useRestateContext } from '@restate/features/restate-context';
import { Button } from '@restate/ui/button';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui/content-panel';
import { EmptyState } from '@restate/ui/empty-state';
import {
  AddFilterTrigger,
  FilterBuilder,
  FilterChip,
  QueryClause,
  QueryClauseOption,
  QueryClauseSchema,
  QueryClauseType,
  readFilterClauses,
  useFilterBuilder,
  writeFilterClauses,
} from '@restate/ui/filter-builder';
import { Icon, IconName } from '@restate/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';
import { useCallback, useMemo, useRef, useState } from 'react';
import { type SortDescriptor } from 'react-aria-components';
import { Form, useSearchParams } from 'react-router';
import { CounterTable } from './CounterTable';
import { FlowControlHero, flowControlTabs } from './FlowControlPage';
import { LIMIT_LIST_QUERY_SIZE } from './limits.constants';
import {
  LIMIT_COUNTER_FILTER_SCHEMA,
  toLimitCounterFilters,
} from './limits.counterFilters';
import {
  LimitListPagination,
  useLimitListPagination,
} from './LimitListPagination';
import {
  LimitRuleFilterOption,
  LimitRuleFilterValue,
} from './LimitRuleFilterValue';
import {
  ALL_LIMIT_COUNTERS,
  ANY_RULE_LIMIT_COUNTERS,
  LIMIT_COUNTER_RULE_QUERY_PARAM,
  limitCounterRuleSelection,
  parseLimitCounterRuleSelection,
  selectedLimitCounterRule,
} from './navigation';

const refreshIconStyles = tv({
  base: 'h-3.5 w-3.5',
  variants: { isFetching: { true: 'animate-spin' } },
});

const RULE_OPTIONS_REQUEST = {
  sort: { field: 'pattern' as const, order: 'ASC' as const },
  limit: LIMIT_LIST_QUERY_SIZE,
};

type CounterSortField = 'usage' | 'pattern' | 'waiting';
type ListLimitCountersRequestBody =
  components['schemas']['ListLimitCountersRequestBody'];

function CountersComponent() {
  const { baseUrl } = useRestateContext();
  const hasVqueues = useFeatures().has('vqueues');
  const [searchParams, setSearchParams] = useSearchParams();
  const searchString = searchParams.toString();
  const ruleSelection = parseLimitCounterRuleSelection(
    searchParams.get(LIMIT_COUNTER_RULE_QUERY_PARAM),
  );
  const selectedRule = selectedLimitCounterRule(ruleSelection);
  const rules = useListLimitRules(RULE_OPTIONS_REQUEST, {
    enabled: hasVqueues,
  });
  const ruleOptions = rules.data?.rules ?? [];
  const ruleFilterSchema = useMemo(
    () =>
      ({
        id: LIMIT_COUNTER_RULE_QUERY_PARAM,
        label: 'Rule',
        operations: [{ value: 'EQUALS', label: 'is' }],
        type: 'STRING',
        options: [
          {
            value: ANY_RULE_LIMIT_COUNTERS,
            label: 'any',
            description: 'Counters governed by any configured rule.',
          },
          {
            value: ALL_LIMIT_COUNTERS,
            label: 'any or none',
            description: 'Include counters without a configured rule.',
          },
          ...ruleOptions.map((rule) => ({
            value: limitCounterRuleSelection(rule.pattern),
            label: rule.pattern,
          })),
        ],
      }) satisfies QueryClauseSchema<'STRING'>,
    [ruleOptions],
  );
  const filterSchema = useMemo(
    () => [ruleFilterSchema, ...LIMIT_COUNTER_FILTER_SCHEMA],
    [ruleFilterSchema],
  );
  const committedCounterFilters = useMemo(
    () =>
      readFilterClauses(
        new URLSearchParams(searchString),
        LIMIT_COUNTER_FILTER_SCHEMA,
      ),
    [searchString],
  );
  const committedFilters = useMemo(
    () => [
      ...committedCounterFilters,
      new QueryClause(ruleFilterSchema, {
        operation: 'EQUALS',
        value: ruleSelection,
      }),
    ],
    [committedCounterFilters, ruleFilterSchema, ruleSelection],
  );
  const query = useFilterBuilder(committedFilters, rules.isLoading);
  const formRef = useRef<HTMLFormElement | null>(null);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
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
    column: 'waiting',
    direction: 'descending' as const,
  });
  const filters = useMemo(
    () => toLimitCounterFilters(committedCounterFilters),
    [committedCounterFilters],
  );
  const commonRequest = useMemo<ListLimitCountersRequestBody>(
    () => ({
      ...(filters.length > 0 && { filters }),
      ...(sortDescriptor && {
        sort: {
          field: sortDescriptor.column as CounterSortField,
          order: sortDescriptor.direction === 'ascending' ? 'ASC' : 'DESC',
        } as const,
      }),
      limit: LIMIT_LIST_QUERY_SIZE,
    }),
    [filters, sortDescriptor],
  );
  const counterRequest = useMemo(
    () => ({
      ...commonRequest,
      includeUnlimited: ruleSelection === ALL_LIMIT_COUNTERS,
      ...(selectedRule ? { rulePattern: selectedRule } : {}),
    }),
    [commonRequest, ruleSelection, selectedRule],
  );
  const counters = useListUserLimits(counterRequest, { enabled: hasVqueues });
  const allCounters = counters.data?.limits ?? [];
  const counterPagination = useLimitListPagination(allCounters, counterRequest);
  const renderRuleValue = useCallback((item: QueryClause<QueryClauseType>) => {
    const value =
      typeof item.value.value === 'string'
        ? parseLimitCounterRuleSelection(item.value.value)
        : ANY_RULE_LIMIT_COUNTERS;
    const pattern = selectedLimitCounterRule(value);
    if (pattern) {
      return <LimitRuleFilterValue pattern={pattern} />;
    }
    return value === ANY_RULE_LIMIT_COUNTERS ? 'any' : 'any or none';
  }, []);
  const renderRuleOption = useCallback(
    (option: QueryClauseOption) => {
      const rulePattern = selectedLimitCounterRule(
        parseLimitCounterRuleSelection(option.value),
      );
      const rule = ruleOptions.find(
        (candidate) => candidate.pattern === rulePattern,
      );
      if (rulePattern && rule) {
        return <LimitRuleFilterOption rule={rule} />;
      }
      return (
        <span className="flex flex-col gap-0.5">
          <span>{option.label}</span>
          <span className="text-xs opacity-80">{option.description}</span>
        </span>
      );
    },
    [ruleOptions],
  );
  const renderFilterOption = useCallback(
    (item: QueryClause<QueryClauseType>) => (
      <div className="flex items-baseline gap-2">
        <span>{item.label}</span>
        <span className="font-mono text-xs opacity-60">
          {item.operations.map((operation) => operation.label).join(' / ')}
        </span>
      </div>
    ),
    [],
  );
  const hasFilters = filters.length > 0;
  const emptyTitle = hasFilters
    ? 'No matching limit counters'
    : selectedRule
      ? 'No active limit counters for this rule'
      : ruleSelection === ANY_RULE_LIMIT_COUNTERS
        ? 'No matching limit counters'
        : 'No active limit counters';
  const emptyDescription = hasFilters
    ? 'Try adjusting the active filters.'
    : selectedRule
      ? 'No active limit counters currently match the selected rule.'
      : ruleSelection === ANY_RULE_LIMIT_COUNTERS
        ? 'No active limit counters currently match a configured rule.'
        : 'Limit counters appear while matching invocations are active.';
  const isFetching = counters.isFetching || rules.isFetching;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <FlowControlHero />
      <ContentPanel tabs={flowControlTabs(baseUrl, 'counters')}>
        <ContentPanelToolbar className="justify-end gap-2 px-1 pb-1">
          <Form
            ref={formRef}
            className="hidden min-w-0 flex-auto sm:block"
            onSubmit={(event) => {
              event.preventDefault();
              const ruleFilter = query.getItem(LIMIT_COUNTER_RULE_QUERY_PARAM);
              const next = writeFilterClauses(
                searchParams,
                query.items.filter(
                  (item) => item.id !== LIMIT_COUNTER_RULE_QUERY_PARAM,
                ),
              );
              next.set(
                LIMIT_COUNTER_RULE_QUERY_PARAM,
                parseLimitCounterRuleSelection(
                  typeof ruleFilter?.value.value === 'string'
                    ? ruleFilter.value.value
                    : ANY_RULE_LIMIT_COUNTERS,
                ),
              );
              setSearchParams(next, { preventScrollReset: true });
            }}
          >
            <FilterBuilder
              query={query}
              schema={filterSchema}
              multiple
              canRemoveItem={(key) => key !== LIMIT_COUNTER_RULE_QUERY_PARAM}
            >
              <AddFilterTrigger
                placeholder="Filter limit counters…"
                title="Limit counter filters"
                disabled={!hasVqueues}
                onItemRemove={scheduleSubmit}
                renderOption={renderFilterOption}
                inputPrefix={
                  <Icon
                    name={IconName.Search}
                    className="h-4 w-4 shrink-0 text-gray-400"
                  />
                }
                tagsPlacement="outside"
                maxVisibleChips="auto"
                chipOverflowStrategy="all"
                tagGroupClassName="min-w-0 flex-nowrap"
                showSectionTitle={false}
                popoverPlacement="bottom start"
                popoverClassName="w-80 min-w-80 max-w-[calc(100vw-2rem)] bg-white/95 p-1"
                optionClassName="gap-2 px-2.5 py-1.5 data-[focused]:bg-blue-50 data-[focused]:text-blue-900 hover:bg-blue-50 hover:text-blue-900"
                className="min-h-7 w-full justify-end text-gray-800"
                inputClassName="min-h-7 max-w-[38ch] flex-[0_1_38ch] bg-white/70 shadow-xs hover:bg-white [&_input]:h-7 [&_input]:min-h-7 [&_input]:py-0.5 [&_input]:placeholder:text-gray-500/75"
              >
                {(props) => {
                  const isRule =
                    props.item.id === LIMIT_COUNTER_RULE_QUERY_PARAM;
                  return (
                    <FilterChip
                      {...props}
                      onRemove={isRule ? undefined : props.onRemove}
                      appearance="light"
                      showRemove={!isRule}
                      popoverPlacement="bottom"
                      disabled={!hasVqueues}
                      valueClassName={isRule ? 'max-w-56' : undefined}
                      popoverClassName={
                        isRule
                          ? 'w-[32rem] max-w-[calc(100vw-2rem)]'
                          : undefined
                      }
                      renderValue={isRule ? renderRuleValue : undefined}
                      renderOption={isRule ? renderRuleOption : undefined}
                    />
                  );
                }}
              </AddFilterTrigger>
            </FilterBuilder>
          </Form>
          <Tooltip>
            <TooltipTrigger>
              <Button
                type="button"
                variant="icon"
                aria-label={
                  isFetching
                    ? 'Refreshing limit counters'
                    : 'Refresh limit counters'
                }
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg p-0"
                onClick={() => {
                  void counters.refetch();
                  void rules.refetch();
                }}
                disabled={!hasVqueues || isFetching}
              >
                <Icon
                  name={IconName.Retry}
                  className={refreshIconStyles({
                    isFetching,
                  })}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent size="sm">Refresh limit counters</TooltipContent>
          </Tooltip>
        </ContentPanelToolbar>
        <ContentPanelBody className="pb-32">
          <ContentPanelSection flush>
            {!hasVqueues ? (
              <EmptyState
                icon={IconName.Gauge}
                title="Flow control is not enabled"
                description="Enable VQueues on the Restate server to inspect limit counters."
              />
            ) : (
              <CounterTable
                ariaLabel="Limit counters"
                counters={counterPagination.pageItems}
                baseUrl={baseUrl}
                variant="all"
                isLoading={counters.isFetching}
                error={counters.error as Error | null}
                dependencies={[
                  searchString,
                  ruleSelection,
                  counters.isFetching,
                ]}
                sortDescriptor={sortDescriptor}
                onSortChange={setSortDescriptor}
                emptyPlaceholder={
                  <EmptyState
                    icon={hasFilters ? IconName.Search : IconName.Gauge}
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                }
              />
            )}
            {!counters.isFetching && (
              <LimitListPagination
                hasMore={Boolean(counters.data?.hasMore)}
                totalItems={allCounters.length}
                pageIndex={counterPagination.pageIndex}
                pageCount={counterPagination.pageCount}
                onPageChange={counterPagination.setPageIndex}
                label="limit counters"
              />
            )}
          </ContentPanelSection>
        </ContentPanelBody>
      </ContentPanel>
    </div>
  );
}

export const limitCounters = { Component: CountersComponent };
