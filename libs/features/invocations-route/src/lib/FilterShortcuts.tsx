import { COLUMN_QUERY_PREFIX, ColumnKey } from './columns';
import { Dispatch, SetStateAction, useMemo } from 'react';
import {
  QueryClause,
  QueryClauseOperationId,
  QueryClauseSchema,
  QueryClauseType,
  QueryClauseValue,
} from '@restate/ui/query-builder';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Button } from '@restate/ui/button';
import type { components } from '@restate/data-access/admin-api-spec';
import { tv } from '@restate/util/styles';
import { Icon, IconName } from '@restate/ui/icons';
import { useSearchParams } from 'react-router';
import {
  FILTER_QUERY_PREFIX,
  SORT_QUERY_PREFIX,
  SORT_NONE,
  getFilterParamKey,
} from './useInvocationsQueryFilters';
import { useInvocationsLastQuery } from '@restate/util/sidebar-nav';
import { useFeatures } from '@restate/data-access/admin-api';

interface FilterShortcut {
  columns: ColumnKey[];
  sort?: components['schemas']['InvocationV2Sort'] | typeof SORT_NONE;
  filters: QueryClause<QueryClauseType>[];
  label: string;
  id: string;
}

function toClause(
  schema: QueryClauseSchema<QueryClauseType>[],
  id: string,
  value: {
    operation: QueryClauseOperationId;
    value?: QueryClauseValue<QueryClauseType>;
    fieldValue?: string;
  },
) {
  const clause = schema.find((clause) => clause.id === id);
  if (!clause) throw new Error(`Unknown invocation filter: ${id}`);
  return new QueryClause(clause, value);
}

const DEFAULT_PRESET_COLUMNS: ColumnKey[] = [
  'id',
  'created_at',
  'modified_at',
  'duration',
  'target',
  'status',
];

const makeShortcuts: (
  schema: QueryClauseSchema<QueryClauseType>[],
  supportsVqueueOnlyFields: boolean,
) => FilterShortcut[] = (schema, supportsVqueueOnlyFields) => [
  {
    id: 'processing',
    label: 'Processing',
    columns: DEFAULT_PRESET_COLUMNS,
    sort: { field: 'created_at', order: 'DESC' },
    filters: [
      toClause(schema, 'status', {
        operation: 'IN',
        value: ['running', 'backing-off'],
      }),
    ],
  },
  {
    id: 'inflight',
    label: 'In-flight',
    columns: DEFAULT_PRESET_COLUMNS,
    sort: { field: 'created_at', order: 'DESC' },
    filters: [
      toClause(schema, 'status', {
        operation: 'NOT_IN',
        value: ['succeeded', 'failed', 'cancelled', 'killed', 'scheduled'],
      }),
    ],
  },
  {
    id: 'stuck',
    label: 'Stuck',
    columns: DEFAULT_PRESET_COLUMNS,
    sort: { field: 'created_at', order: 'ASC' },
    filters: [
      toClause(schema, 'status', {
        operation: 'IN',
        value: [
          'pending',
          'backing-off',
          'paused',
          'ready',
          ...(supportsVqueueOnlyFields ? (['yielded'] as const) : []),
        ],
      }),
    ],
  },
  {
    id: 'all',
    label: 'All',
    columns: DEFAULT_PRESET_COLUMNS,
    sort: { field: 'created_at', order: 'DESC' },
    filters: [],
  },
  {
    id: 'notcompleted',
    label: 'Not completed',
    columns: DEFAULT_PRESET_COLUMNS,
    sort: { field: 'created_at', order: 'DESC' },
    filters: [
      toClause(schema, 'status', {
        operation: 'NOT_IN',
        value: ['succeeded', 'failed', 'cancelled', 'killed'],
      }),
    ],
  },
  // {
  //   id: 'idempotent',
  //   label: 'Idempotent',
  //   columns: [...DEFAULT_PRESET_COLUMNS, 'idempotency_key'],
  //   filters: [
  //     toClause(schema, 'idempotency_key', {
  //       operation: 'IS NOT NULL',
  //     }),
  //   ],
  // },
  // {
  //   id: 'retried',
  //   label: 'Most retried',
  //   columns: [...DEFAULT_PRESET_COLUMNS, 'retry_count'],
  //   sort: {
  //     field: 'retry_count',
  //     order: 'DESC',
  //   },
  //   filters: [
  //     toClause(schema, 'retry_count', {
  //       operation: 'GREATER_THAN',
  //       value: 1,
  //     }),
  //   ],
  // },
  {
    id: 'scheduled',
    label: 'Scheduled',
    columns: [...DEFAULT_PRESET_COLUMNS, 'scheduled_start_at'],
    sort: { field: 'created_at', order: 'DESC' },
    filters: [
      toClause(schema, 'status', {
        operation: 'IN',
        value: ['scheduled'],
      }),
    ],
  },
];

const itemStyles = tv({
  base: 'max-h-5 shrink-0 rounded-full border border-white/20 bg-transparent px-3 py-0.5 text-xs text-white/80 hover:bg-white/15 pressed:bg-white/20',
});

// Quick-filter pills shown inline before the "More" overflow dropdown.
const VISIBLE_SHORTCUTS_COUNT = 4;

export function FilterShortcuts({
  setPageIndex,
  schema,
}: {
  setPageIndex: Dispatch<SetStateAction<number>>;
  schema: QueryClauseSchema<QueryClauseType>[];
}) {
  const features = useFeatures();
  const supportsVqueueOnlyFields = features.has('vqueues');
  const shortcuts = useMemo(
    () => makeShortcuts(schema, supportsVqueueOnlyFields),
    [schema, supportsVqueueOnlyFields],
  );
  const visibleShortcuts = shortcuts.slice(0, VISIBLE_SHORTCUTS_COUNT);
  const overflowShortcuts = shortcuts.slice(VISIBLE_SHORTCUTS_COUNT);
  const [searchParams, setSearchParams] = useSearchParams();
  const { saveLastQuery } = useInvocationsLastQuery();

  const setFilter = (item: FilterShortcut) => {
    setPageIndex(0);

    const newSearchParams = new URLSearchParams(searchParams);
    Array.from(newSearchParams.keys())
      .filter((key) => key.startsWith(FILTER_QUERY_PREFIX))
      .forEach((key) => newSearchParams.delete(key));
    item.filters
      .filter((clause) => clause.isValid)
      .forEach((clause) => {
        newSearchParams.set(getFilterParamKey(clause), String(clause));
      });

    newSearchParams.delete(COLUMN_QUERY_PREFIX);
    item.columns.forEach((col) => {
      newSearchParams.append(COLUMN_QUERY_PREFIX, col);
    });

    if (item.sort === SORT_NONE) {
      newSearchParams.set(SORT_QUERY_PREFIX + 'field', SORT_NONE);
      newSearchParams.delete(SORT_QUERY_PREFIX + 'order');
    } else if (item.sort) {
      newSearchParams.set(SORT_QUERY_PREFIX + 'field', item.sort.field);
      newSearchParams.set(SORT_QUERY_PREFIX + 'order', item.sort.order);
    } else {
      newSearchParams.delete(SORT_QUERY_PREFIX + 'field');
      newSearchParams.delete(SORT_QUERY_PREFIX + 'order');
    }

    // Keep lastQuery in sync with the committed state so the next ?restore=1
    // navigation restores what the user just selected.
    saveLastQuery(newSearchParams);
    setSearchParams(newSearchParams);
  };

  return (
    <>
      {visibleShortcuts.map((item) => (
        <Button
          key={item.id}
          variant="icon"
          onClick={() => setFilter(item)}
          className={itemStyles()}
        >
          {item.label}
        </Button>
      ))}
      {overflowShortcuts.length > 0 && (
        <Dropdown>
          <DropdownTrigger>
            <Button variant="icon" className={itemStyles()}>
              More
              <Icon
                name={IconName.ChevronsUpDown}
                className="-mr-2 ml-2 h-3 w-3"
              />
            </Button>
          </DropdownTrigger>
          <DropdownPopover>
            <DropdownSection title="Quick filters">
              <DropdownMenu
                onSelect={(value) => {
                  const filter = shortcuts.find(({ id }) => id === value);
                  if (filter) {
                    setFilter(filter);
                  }
                }}
              >
                {overflowShortcuts.map((item) => (
                  <DropdownItem value={item.id} key={item.id}>
                    {item.label}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </DropdownSection>
          </DropdownPopover>
        </Dropdown>
      )}
    </>
  );
}
