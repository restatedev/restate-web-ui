import { useFeatures } from '@restate/data-access/admin-api';
import {
  useListLimitRules,
  useListUserLimits,
} from '@restate/data-access/admin-api-hooks';
import { useRestateContext } from '@restate/features/restate-context';
import { LimitRuleTarget } from '@restate/features/vqueue-ui';
import { Button } from '@restate/ui/button';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui/content-panel';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { EmptyState } from '@restate/ui/empty-state';
import { Icon, IconName } from '@restate/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';
import { useMemo, useState } from 'react';
import {
  Button as AriaButton,
  Input,
  Label,
  SearchField,
  type SortDescriptor,
} from 'react-aria-components';
import { useSearchParams } from 'react-router';
import { CounterTable } from './CounterTable';
import { FlowControlHero, flowControlTabs } from './FlowControlPage';
import { LIMIT_LIST_QUERY_SIZE } from './limits.constants';
import { LimitValue } from './LimitValue';
import {
  LimitListPagination,
  useLimitListPagination,
} from './LimitListPagination';
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

const ruleFilterGroupStyles = tv({
  base: 'order-first flex h-7 max-w-44 min-w-28 items-stretch rounded-lg border border-black/10 bg-white shadow-xs sm:max-w-[22rem]',
});

const ruleFilterButtonStyles = tv({
  base: 'flex h-full min-w-0 flex-1 items-center gap-1 rounded-[calc(0.5rem-1px)] border-0 bg-transparent px-1.5 py-0 text-xs font-medium text-zinc-600 shadow-none',
  variants: {
    hasClear: {
      true: 'rounded-r-none',
    },
  },
});

const RULE_OPTIONS_REQUEST = {
  sort: { field: 'pattern' as const, order: 'ASC' as const },
  limit: LIMIT_LIST_QUERY_SIZE,
};

type CounterSortField = 'usage' | 'pattern' | 'waiting';

function CountersComponent() {
  const { baseUrl } = useRestateContext();
  const hasVqueues = useFeatures().has('vqueues');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const ruleSelection = parseLimitCounterRuleSelection(
    searchParams.get(LIMIT_COUNTER_RULE_QUERY_PARAM),
  );
  const selectedRule = selectedLimitCounterRule(ruleSelection);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'waiting',
    direction: 'descending' as const,
  });
  const commonRequest = useMemo(
    () => ({
      ...(submittedSearch ? { search: submittedSearch } : {}),
      sort: {
        field: sortDescriptor.column as CounterSortField,
        order: sortDescriptor.direction === 'ascending' ? 'ASC' : 'DESC',
      } as const,
      limit: LIMIT_LIST_QUERY_SIZE,
    }),
    [submittedSearch, sortDescriptor],
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
  const rules = useListLimitRules(RULE_OPTIONS_REQUEST, {
    enabled: hasVqueues,
  });
  const ruleOptions = rules.data?.rules ?? [];
  const allCounters = counters.data?.limits ?? [];
  const counterPagination = useLimitListPagination(allCounters, counterRequest);
  const ruleFilterValue =
    ruleSelection === ANY_RULE_LIMIT_COUNTERS ? 'any' : 'any or none';
  const ruleFilterLabel = selectedRule
    ? `Rule is ${selectedRule}`
    : `Rule is ${ruleFilterValue}`;
  const selectRule = (value: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set(
          LIMIT_COUNTER_RULE_QUERY_PARAM,
          parseLimitCounterRuleSelection(value),
        );
        return next;
      },
      { preventScrollReset: true },
    );
  };
  const clearRuleFilter = () => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete(LIMIT_COUNTER_RULE_QUERY_PARAM);
        return next;
      },
      { preventScrollReset: true },
    );
  };
  const emptyTitle = submittedSearch
    ? 'No matching limit counters'
    : selectedRule
      ? 'No active limit counters for this rule'
      : ruleSelection === ANY_RULE_LIMIT_COUNTERS
        ? 'No governed limit counters'
        : 'No active limit counters';
  const emptyDescription = submittedSearch
    ? 'Try a different scope or limit key.'
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
          <SearchField
            aria-label="Filter limit counters"
            onSubmit={(value) => setSubmittedSearch(value.trim())}
            onClear={() => setSubmittedSearch('')}
            isDisabled={!hasVqueues}
            className="group hidden min-w-0 flex-auto outline-none sm:block sm:max-w-[38ch]"
          >
            <Label className="sr-only">Filter limit counters</Label>
            <div className="relative min-h-7">
              <Input
                placeholder="Search by scope or limit key…"
                className="mt-0 h-7 w-full min-w-0 rounded-lg border border-gray-200 bg-white/70 px-2 py-0.5 pr-8 pl-7 text-sm text-gray-800 shadow-xs outline-offset-2 placeholder:text-gray-500/75 hover:bg-white focus:border-blue-500/30 focus:bg-white focus:ring-0 focus:outline-2 focus:outline-blue-600 disabled:text-zinc-400 [&::-webkit-search-cancel-button]:hidden"
              />
              <Icon
                name={IconName.Search}
                className="pointer-events-none absolute top-0 bottom-0 left-1.5 aspect-square h-full p-1 text-gray-400"
              />
              <AriaButton
                aria-label="Clear filter"
                className="absolute top-1/2 right-1 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 outline-offset-1 group-empty:hidden hover:bg-zinc-200/60 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <Icon name={IconName.X} className="h-3.5 w-3.5" />
              </AriaButton>
            </div>
          </SearchField>
          <div className={ruleFilterGroupStyles()}>
            <Dropdown>
              <DropdownTrigger>
                <Button
                  variant="icon"
                  disabled={!hasVqueues}
                  aria-label={`Filter by rule: ${ruleFilterLabel}`}
                  className={ruleFilterButtonStyles({
                    hasClear: Boolean(selectedRule),
                  })}
                >
                  <Icon
                    name={IconName.Filters}
                    className="h-3.5 w-3.5 shrink-0 text-zinc-400"
                  />
                  <span className="shrink-0 text-zinc-500">Rule is</span>
                  {selectedRule ? (
                    <LimitRuleTarget
                      pattern={selectedRule}
                      density="tight"
                      className="min-w-0"
                      showIcon={false}
                      showTooltip={false}
                    />
                  ) : (
                    <span className="truncate font-semibold text-zinc-700">
                      {ruleFilterValue}
                    </span>
                  )}
                  <Icon
                    name={IconName.ChevronsUpDown}
                    className="ml-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400"
                  />
                </Button>
              </DropdownTrigger>
              <DropdownPopover placement="bottom start" className="w-[32rem]">
                <DropdownSection title="Show limit counters">
                  <DropdownMenu
                    selectable
                    selectedItems={[ruleSelection]}
                    onSelect={selectRule}
                    aria-label="Show limit counters"
                  >
                    <DropdownItem value={ALL_LIMIT_COUNTERS}>
                      All limit counters
                    </DropdownItem>
                    <DropdownItem value={ANY_RULE_LIMIT_COUNTERS}>
                      Any configured rule
                    </DropdownItem>
                  </DropdownMenu>
                </DropdownSection>
                {ruleOptions.length > 0 && (
                  <DropdownSection title="Specific rule">
                    <DropdownMenu
                      selectable
                      selectedItems={[ruleSelection]}
                      onSelect={selectRule}
                      aria-label="Select a specific rule"
                    >
                      {ruleOptions.map((rule) => (
                        <DropdownItem
                          key={rule.pattern}
                          value={limitCounterRuleSelection(rule.pattern)}
                          className="py-1.5"
                          contentClassName="overflow-visible"
                        >
                          <span className="flex min-w-0 flex-1 items-center justify-between gap-4">
                            <LimitRuleTarget
                              pattern={rule.pattern}
                              showTooltip={false}
                            />
                            <span className="shrink-0">
                              <LimitValue
                                value={rule.limits.concurrency}
                                disabled={rule.disabled}
                              />
                            </span>
                          </span>
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </DropdownSection>
                )}
              </DropdownPopover>
            </Dropdown>
            {selectedRule && (
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    type="button"
                    variant="icon"
                    aria-label="Clear rule filter"
                    className="flex h-full w-7 shrink-0 items-center justify-center rounded-l-none rounded-r-[calc(0.5rem-1px)] border-0 border-l border-black/10 bg-transparent p-0 text-zinc-400 shadow-none hover:bg-zinc-100 hover:text-zinc-700"
                    onClick={clearRuleFilter}
                  >
                    <Icon name={IconName.X} className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent size="sm">Clear rule filter</TooltipContent>
              </Tooltip>
            )}
          </div>
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
                  submittedSearch,
                  ruleSelection,
                  counters.isFetching,
                ]}
                sortDescriptor={sortDescriptor}
                onSortChange={setSortDescriptor}
                emptyPlaceholder={
                  <EmptyState
                    icon={submittedSearch ? IconName.Search : IconName.Gauge}
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
