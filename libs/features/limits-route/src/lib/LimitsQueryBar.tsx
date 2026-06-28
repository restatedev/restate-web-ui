import { Button, SubmitButton } from '@restate/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { SubmitShortcutKey, useSubmitShortcut } from '@restate/ui/keyboard';
import {
  AddQueryTrigger,
  QueryBuilder,
  QueryClauseSchema,
  QueryClauseType,
} from '@restate/ui/query-builder';
import {
  ClauseChip,
  FiltersTrigger,
} from '@restate/features/invocations-route';
import { tv } from '@restate/util/styles';
import { Dispatch, SetStateAction } from 'react';
import { useSearchParams } from 'react-router';
import { QuickFilterPreset, SortOption } from './limitsSchema';
import {
  buildQuickFilterParams,
  LimitSort,
  LimitsQueryKind,
  useLimitsForm,
} from './useLimitsQuery';

type LimitsSchema = QueryClauseSchema<QueryClauseType>[];

function LimitsSort({
  sorts,
  sort,
  setSort,
}: {
  sorts: SortOption[];
  sort: LimitSort;
  setSort: Dispatch<SetStateAction<LimitSort>>;
}) {
  const current = sorts.find((option) => option.id === sort.field);
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="secondary"
          className="flex min-w-0 shrink-0 items-center gap-[0.7ch] rounded-lg bg-white/25 px-1.5 py-1 text-xs text-zinc-50 hover:bg-white/30 pressed:bg-white/30"
        >
          <Icon
            name={sort.order === 'ASC' ? IconName.ArrowUp : IconName.ArrowDown}
            className="h-3.5 w-3.5"
          />
          <span className="shrink-0 whitespace-nowrap">Sort by</span>
          <span className="truncate font-semibold">
            {current?.label ?? sorts[0]?.label ?? 'Sort'}
          </span>
          <Icon
            name={IconName.ChevronsUpDown}
            className="ml-2 h-3.5 w-3.5 shrink-0"
          />
        </Button>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownSection title="Sort by">
          <DropdownMenu
            selectable
            selectedItems={current ? [current.id] : []}
            onSelect={(value) =>
              value && setSort((prev) => ({ ...prev, field: String(value) }))
            }
          >
            {sorts.map((option) => (
              <DropdownItem key={option.id} value={option.id}>
                {option.label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
        <DropdownSection>
          <DropdownMenu
            selectable
            selectedItems={[sort.order]}
            onSelect={(value) =>
              value &&
              setSort((prev) => ({
                ...prev,
                order: value as LimitSort['order'],
              }))
            }
          >
            <DropdownItem value="ASC">Ascending</DropdownItem>
            <DropdownItem value="DESC">Descending</DropdownItem>
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}

const presetChipStyles = tv({
  base: 'max-h-5 shrink-0 rounded-full border border-white/20 bg-transparent px-3 py-0.5 text-xs text-white/80 hover:bg-white/15 pressed:bg-white/20',
});

function QuickFilters({
  kind,
  schema,
  presets,
}: {
  kind: LimitsQueryKind;
  schema: LimitsSchema;
  presets: QuickFilterPreset[];
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  return (
    <div className="absolute right-0 bottom-0 left-0 flex h-8 w-full overflow-hidden rounded-b-xl mask-[linear-gradient(to_right,transparent_0,black_6px,black_calc(100%-192px),transparent_calc(100%-100px))]">
      <div className="flex [scrollbar-width:thin] items-center gap-2 overflow-auto pb-0.5 pl-1.5">
        <div className="ml-1 flex h-full shrink-0 items-center text-xs text-white/70">
          Quick Filters:
        </div>
        {presets.map((preset) => (
          <Button
            key={preset.id}
            variant="icon"
            className={presetChipStyles()}
            onClick={() =>
              setSearchParams(
                buildQuickFilterParams(searchParams, kind, schema, preset),
                { preventScrollReset: true },
              )
            }
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export interface LimitsQueryBarProps {
  kind: LimitsQueryKind;
  schema: LimitsSchema;
  sorts: SortOption[];
  presets: QuickFilterPreset[];
  defaultSort: LimitSort;
  placeholder: string;
  isFetching?: boolean;
}

export function LimitsQueryBar({
  kind,
  schema,
  sorts,
  presets,
  defaultSort,
  placeholder,
  isFetching,
}: LimitsQueryBarProps) {
  const submitRef = useSubmitShortcut();
  const { query, sortParams, setSortParams, commitQuery } = useLimitsForm({
    kind,
    schema,
    defaultSort,
  });

  return (
    <form
      className="relative flex w-[60rem] max-w-full flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        commitQuery();
      }}
    >
      <QueryBuilder query={query} schema={schema} multiple>
        <AddQueryTrigger
          MenuTrigger={FiltersTrigger}
          placeholder={placeholder}
          prefix={
            <LimitsSort
              sorts={sorts}
              sort={sortParams}
              setSort={setSortParams}
            />
          }
          title="Filters"
          className="w-full rounded-xl border-transparent pb-8 has-[input[data-focused=true]]:border-blue-500 has-[input[data-focused=true]]:ring-blue-500 [&_input]:min-w-[25ch] [&_input]:placeholder-zinc-400 [&_input+*]:right-24 [&_input::-webkit-search-cancel-button]:invert"
        >
          {ClauseChip}
        </AddQueryTrigger>
      </QueryBuilder>
      <QuickFilters kind={kind} schema={schema} presets={presets} />
      <SubmitButton
        ref={submitRef}
        isPending={isFetching}
        className="absolute right-1 bottom-1 flex h-7 items-center gap-2 rounded-lg py-0 pr-0.5 pl-4 disabled:bg-gray-400 disabled:text-gray-200"
      >
        Query
        <SubmitShortcutKey />
      </SubmitButton>
    </form>
  );
}
