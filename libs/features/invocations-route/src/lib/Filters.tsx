import { Button } from '@restate/ui/button';
import {
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Dropdown,
  DropdownTrigger,
  DropdownPopover,
} from '@restate/ui/dropdown';
import {
  FormFieldNumberInput,
  FormFieldInput,
  FormFieldDateTimeInput,
} from '@restate/ui/form-field';
import { Icon, IconName } from '@restate/ui/icons';
import {
  QueryClause,
  QueryClauseOperationId,
  QueryClauseType,
} from '@restate/ui/query-builder';
import { PropsWithChildren, useMemo } from 'react';

export function ClauseChip({
  item,
  onRemove,
  onUpdate,
}: {
  item: QueryClause<QueryClauseType>;
  onRemove?: VoidFunction;
  onUpdate?: (item: QueryClause<QueryClauseType>) => void;
}) {
  return (
    <EditQueryTrigger clause={item} onRemove={onRemove} onUpdate={onUpdate}>
      <Button
        data-filter-id={item.id}
        autoFocus={item.isNew}
        variant="secondary"
        className="inline-flex gap-[0.7ch] items-center py-1 rounded-lg bg-white/[0.25] hover:bg-white/30 pressed:bg-white/30 text-zinc-50 text-xs px-1.5"
      >
        <span className="">{item.label}</span>
        {item.operationLabel?.split(' ').map((segment) => (
          <span className="font-mono" key={segment}>
            {segment}
          </span>
        ))}
        <span className="font-semibold">{item.valueLabel}</span>
        <Icon name={IconName.ChevronsUpDown} className="w-3.5 h-3.5 ml-2" />
      </Button>
    </EditQueryTrigger>
  );
}

function EditQueryTrigger({
  children,
  onRemove,
  onUpdate,
  clause,
}: PropsWithChildren<{
  clause: QueryClause<QueryClauseType>;
  onRemove?: VoidFunction;
  onUpdate?: (item: QueryClause<QueryClauseType>) => void;
}>) {
  const selectedOperations = useMemo(
    () => (clause.value.operation ? [clause.value.operation] : []),
    [clause.value.operation]
  );

  if (!clause) {
    return null;
  }
  const canChangeOperation = clause.operations.length > 1;
  const title = canChangeOperation
    ? clause.schema.label
    : `${clause.schema.label} ${clause.operationLabel}`;

  return (
    <Dropdown
      defaultOpen={clause.isNew}
      onOpenChange={(isOpen) => {
        // TODO: refactor focus
        if (!isOpen && clause.isNew) {
          clause.isNew = false;
          const el = document.querySelector(`[data-filter-id=${clause.id}]`);
          if (el instanceof HTMLElement) {
            setTimeout(() => {
              el.focus();
            }, 0);
          }
        }
      }}
    >
      <DropdownTrigger>{children}</DropdownTrigger>
      <DropdownPopover placement="top">
        <DropdownSection title={title}>
          {canChangeOperation && (
            <DropdownMenu
              selectable
              multiple
              selectedItems={selectedOperations}
              autoFocus={false}
              onSelect={(operations) => {
                const newClause = new QueryClause(clause.schema, {
                  ...clause.value,
                  operation: Array.from(operations).at(
                    -1
                  ) as QueryClauseOperationId,
                });
                newClause.isNew = clause.isNew;

                onUpdate?.(newClause);
              }}
            >
              {clause.operations.map((op) => (
                <DropdownItem value={op.value} key={op.value}>
                  {op.label}
                  {op.description}
                </DropdownItem>
              ))}
            </DropdownMenu>
          )}
        </DropdownSection>
        <DropdownSection>
          <ValueSelector clause={clause} onUpdate={onUpdate} />
        </DropdownSection>
        {clause.id === 'status' && (
          <p className="text-xs text-gray-500 px-5 py-1 max-w-xs mb-2">
            Completed invocations (succeeded, failed, cancelled, killed) are
            retained only for workflows and those with idempotency keys, and
            only for the service's specified retention period.
          </p>
        )}
        <DropdownMenu onSelect={onRemove} autoFocus={false}>
          <DropdownItem destructive>Remove</DropdownItem>
        </DropdownMenu>
      </DropdownPopover>
    </Dropdown>
  );
}

function ValueSelector({
  clause,
  onUpdate,
}: {
  clause: QueryClause<QueryClauseType>;
  onUpdate?: (item: QueryClause<QueryClauseType>) => void;
}) {
  if (clause.type === 'STRING_LIST') {
    // TODO: redo passing options
    if (clause.options) {
      return (
        <DropdownMenu
          autoFocus
          selectable
          multiple
          selectedItems={clause.value.value as string[]}
          onSelect={(values) => {
            const newClause = new QueryClause(
              { ...clause.schema, options: clause.options },
              {
                ...clause.value,
                value: Array.from(values as Set<string>),
              }
            );
            newClause.isNew = clause.isNew;

            onUpdate?.(newClause);
          }}
          className="max-h-96"
        >
          {clause.options?.map((opt) => (
            <DropdownItem value={opt.value} key={opt.value}>
              <div className="flex flex-col gap-0.5">
                {opt.label}
                <div className="text-xs opacity-80">{opt.description}</div>
              </div>
            </DropdownItem>
          ))}
        </DropdownMenu>
      );
    }
  }

  if (clause.type === 'STRING') {
    if (clause.options) {
      return (
        <DropdownMenu
          autoFocus
          selectable
          selectedItems={
            typeof clause.value.value === 'string' ? [clause.value.value] : []
          }
          onSelect={(value) => {
            const newClause = new QueryClause(clause.schema, {
              ...clause.value,
              value,
            });
            newClause.isNew = clause.isNew;

            onUpdate?.(newClause);
          }}
        >
          {clause.options?.map((opt) => (
            <DropdownItem value={opt.value} key={opt.value}>
              <div className="flex flex-col gap-0.5">
                {opt.label}
                <div className="text-xs opacity-80">{opt.description}</div>
              </div>
            </DropdownItem>
          ))}
        </DropdownMenu>
      );
    }
    return (
      <FormFieldInput
        autoFocus
        label={clause.label}
        placeholder={clause.label}
        value={clause.value.value as string}
        onChange={(value) => {
          const newClause = new QueryClause(clause.schema, {
            ...clause.value,
            value,
          });
          newClause.isNew = clause.isNew;

          onUpdate?.(newClause);
        }}
        className="m-1 [&_label]:hidden"
      />
    );
  }

  if (clause.type === 'NUMBER') {
    return (
      <FormFieldNumberInput
        autoFocus
        label={clause.label}
        placeholder={clause.label}
        value={clause.value.value as number}
        onChange={(value) => {
          const newClause = new QueryClause(clause.schema, {
            ...clause.value,
            value,
          });
          newClause.isNew = clause.isNew;

          onUpdate?.(newClause);
        }}
        className="m-1 [&_label]:hidden"
      />
    );
  }

  if (clause.type === 'DATE') {
    return (
      <>
        <FormFieldDateTimeInput
          placeholder={clause.label}
          placeholderValue={new Date().toISOString()}
          value={(clause.value.value as Date)?.toISOString()}
          onChange={(value) => {
            const newClause = new QueryClause(clause.schema, {
              ...clause.value,
              value: value ? new Date(value) : undefined,
            });
            newClause.isNew = clause.isNew;
            onUpdate?.(newClause);
          }}
          className="m-1"
        />
        <DropdownMenu
          autoFocus
          onSelect={(value) => {
            const multiplier: Record<string, number> = {
              '1m': 1,
              '1h': 60,
              '1D': 60 * 24,
            };
            const newClause = new QueryClause(clause.schema, {
              ...clause.value,
              value: value
                ? new Date(Date.now() - 60 * 1000 * (multiplier[value] ?? 1))
                : undefined,
            });
            newClause.isNew = clause.isNew;

            onUpdate?.(newClause);
          }}
        >
          <DropdownItem value="1m">1min ago</DropdownItem>
          <DropdownItem value="1h">1h ago</DropdownItem>
          <DropdownItem value="1D">1day ago</DropdownItem>
        </DropdownMenu>
      </>
    );
  }
  return null;
}

export function FiltersTrigger() {
  return (
    <kbd className="bg-zinc-600 text-zinc-400 px-1.5 rounded ml-1 mr-1 text-sm">
      /
    </kbd>
  );
}
