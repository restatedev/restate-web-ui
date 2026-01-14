import { ColumnKey } from './columns';
import { Dispatch, SetStateAction, useRef, useState } from 'react';
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
  DropdownMenuSelection,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Button, SubmitButton } from '@restate/ui/button';
import { SortInvocations } from '@restate/data-access/admin-api';
import { ListData } from 'react-stately';
import { tv } from '@restate/util/styles';
import { Icon, IconName } from '@restate/ui/icons';

interface FilterShortcut {
  columns: ColumnKey[];
  sort: SortInvocations;
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
  return new QueryClause(schema.find((clause) => clause.id === id)!, value);
}

// TODO: remove empty service, status filters
const makeShortcuts: (
  schema: QueryClauseSchema<QueryClauseType>[],
) => FilterShortcut[] = (schema) => [
  {
    id: 'all',
    label: 'All',
    columns: ['id', 'created_at', 'modified_at', 'target', 'status'],
    sort: {
      field: 'modified_at',
      order: 'DESC',
    },
    filters: [
      toClause(schema, 'target_service_name', {
        operation: 'IN',
        value: [],
      }),
      toClause(schema, 'status', {
        operation: 'IN',
        value: [],
      }),
    ],
  },
  {
    id: 'inflight',
    label: 'In-flight invocations',
    columns: ['id', 'created_at', 'modified_at', 'target', 'status'],
    sort: {
      field: 'modified_at',
      order: 'DESC',
    },
    filters: [
      toClause(schema, 'target_service_name', {
        operation: 'IN',
        value: [],
      }),
      toClause(schema, 'status', {
        operation: 'NOT_IN',
        value: ['succeeded', 'failed', 'cancelled', 'killed'],
      }),
    ],
  },
  {
    id: 'stuck',
    label: 'Stuck invocations',
    columns: ['id', 'created_at', 'modified_at', 'target', 'status'],
    sort: {
      field: 'modified_at',
      order: 'ASC',
    },
    filters: [
      toClause(schema, 'target_service_name', {
        operation: 'IN',
        value: [],
      }),
      toClause(schema, 'status', {
        operation: 'IN',
        value: ['pending', 'backing-off', 'suspended', 'paused', 'ready'],
      }),
      toClause(schema, 'modified_at', {
        operation: 'BEFORE',
        value: new Date(Date.now() - 30 * 60 * 1000),
      }),
    ],
  },
  {
    id: 'workflow',
    label: 'Workflow runs',
    columns: ['id', 'created_at', 'modified_at', 'target', 'status'],
    sort: {
      field: 'modified_at',
      order: 'DESC',
    },
    filters: [
      toClause(schema, 'target_service_name', {
        operation: 'IN',
        value: [],
      }),
      toClause(schema, 'status', {
        operation: 'IN',
        value: [],
      }),
      toClause(schema, 'target_service_ty', {
        operation: 'IN',
        value: ['workflow'],
      }),
      toClause(schema, 'target_handler_name', {
        operation: 'IN',
        value: ['run'],
      }),
    ],
  },
  {
    id: 'vo',
    label: 'Active Virtual Objects',
    columns: ['id', 'created_at', 'modified_at', 'target', 'status'],
    sort: {
      field: 'modified_at',
      order: 'DESC',
    },
    filters: [
      toClause(schema, 'target_service_name', {
        operation: 'IN',
        value: [],
      }),
      toClause(schema, 'status', {
        operation: 'IN',
        value: ['running', 'backing-off', 'suspended', 'paused'],
      }),

      toClause(schema, 'target_service_ty', {
        operation: 'IN',
        value: ['virtual_object'],
      }),
    ],
  },
  {
    id: 'idempotent',
    label: 'Idempotent invocations',
    columns: [
      'id',
      'created_at',
      'modified_at',
      'target',
      'status',
      'idempotency_key',
    ],
    sort: {
      field: 'modified_at',
      order: 'DESC',
    },
    filters: [
      toClause(schema, 'target_service_name', {
        operation: 'IN',
        value: [],
      }),
      toClause(schema, 'status', {
        operation: 'IN',
        value: [],
      }),
      toClause(schema, 'idempotency_key', {
        operation: 'IS NOT NULL',
      }),
    ],
  },
  {
    id: 'retried',
    label: 'Most retried invocations',
    columns: [
      'id',
      'created_at',
      'modified_at',
      'target',
      'status',
      'retry_count',
    ],
    sort: {
      field: 'retry_count',
      order: 'DESC',
    },
    filters: [
      toClause(schema, 'target_service_name', {
        operation: 'IN',
        value: [],
      }),
      toClause(schema, 'status', {
        operation: 'IN',
        value: [],
      }),
      toClause(schema, 'retry_count', {
        operation: 'GREATER_THAN',
        value: 1,
      }),
    ],
  },
  {
    id: 'restarted',
    label: 'Restarted invocations',
    columns: [
      'id',
      'created_at',
      'modified_at',
      'target',
      'status',
      'restarted_from',
    ],
    sort: {
      field: 'modified_at',
      order: 'DESC',
    },
    filters: [
      toClause(schema, 'target_service_name', {
        operation: 'IN',
        value: [],
      }),
      toClause(schema, 'status', {
        operation: 'IN',
        value: [],
      }),
      toClause(schema, 'invoked_by', {
        operation: 'EQUALS',
        value: 'restart_as_new',
      }),
    ],
  },
  {
    id: 'scheduled',
    label: 'Scheduled invocations',
    columns: [
      'id',
      'created_at',
      'modified_at',
      'scheduled_start_at',
      'target',
      'status',
    ],
    sort: {
      field: 'scheduled_start_at',
      order: 'ASC',
    },
    filters: [
      toClause(schema, 'target_service_name', {
        operation: 'IN',
        value: [],
      }),
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
export function FilterShortcuts({
  query,
  setPageIndex,
  setSortParams,
  schema,
  setSelectedColumns,
}: {
  query: ListData<QueryClause<QueryClauseType>>;
  setSortParams: Dispatch<SetStateAction<SortInvocations>>;
  setPageIndex: Dispatch<SetStateAction<number>>;
  schema: QueryClauseSchema<QueryClauseType>[];
  setSelectedColumns: (keys: DropdownMenuSelection) => void;
}) {
  const [shortcuts] = useState(() => makeShortcuts(schema));
  const [first, second, third, ...rest] = shortcuts;
  const submitButton = useRef<HTMLButtonElement | null>(null);

  const setFilter = (item: FilterShortcut) => {
    setPageIndex(0);
    setSelectedColumns(new Set(item.columns));
    setSortParams(item.sort);
    query.items.forEach((item) => {
      query.remove(item.id);
    });
    query.insert(0, ...item.filters);
    setTimeout(() => {
      submitButton.current?.click();
    }, 0);
  };

  return (
    <>
      {first && (
        <Button
          variant="icon"
          onClick={() => setFilter(first)}
          className={itemStyles()}
        >
          {first?.label}
        </Button>
      )}
      {second && (
        <Button
          variant="icon"
          onClick={() => setFilter(second)}
          className={itemStyles()}
        >
          {second?.label}
        </Button>
      )}
      {third && (
        <Button
          variant="icon"
          onClick={() => setFilter(third)}
          className={itemStyles()}
        >
          {third?.label}
        </Button>
      )}
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
              {rest.map((item) => (
                <DropdownItem value={item.id}>{item.label}</DropdownItem>
              ))}
            </DropdownMenu>
          </DropdownSection>
        </DropdownPopover>
      </Dropdown>
      <SubmitButton className="hidden" ref={submitButton} />
    </>
  );
}
