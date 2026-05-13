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
import { FocusShortcutKey } from '@restate/ui/keyboard';
import {
  QueryClause,
  QueryClauseOperationId,
  QueryClauseType,
  useNewQueryId,
} from '@restate/ui/query-builder';
import {
  PropsWithChildren,
  RefObject,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Form } from 'react-router';

export function ClauseChip({
  item,
  onRemove,
  onUpdate,
  formRef,
}: {
  item: QueryClause<QueryClauseType>;
  onRemove?: VoidFunction;
  onUpdate?: (item: QueryClause<QueryClauseType>) => void;
  formRef?: RefObject<HTMLFormElement | null>;
}) {
  const isNew = useNewQueryId() === item.id;
  return (
    <EditQueryTrigger
      clause={item}
      onRemove={onRemove}
      onUpdate={onUpdate}
      onClose={() => setTimeout(() => formRef?.current?.requestSubmit(), 0)}
      isNew={isNew}
    >
      <Button
        autoFocus={isNew}
        data-filter-id={item.id}
        variant="secondary"
        className="flex min-w-0 items-center gap-[0.7ch] rounded-lg bg-white/25 px-1.5 py-1 text-xs text-zinc-50 hover:bg-white/30 pressed:bg-white/30"
      >
        <>
          <span className="shrink-0 whitespace-nowrap">{item.label}</span>
          {item.operationLabel?.split(' ').map((segment) => (
            <span className="font-mono" key={segment}>
              {segment}
            </span>
          ))}
          <span className="max-w-56 truncate font-semibold">
            {item.type === 'STRING_LIST' &&
            (!item.value.operation || item.value.operation === 'IN') &&
            (item.isAllSelected || item.isNothingSelected)
              ? 'Any'
              : item.valueLabel ||
                (['IS NULL', 'IS NOT NULL'].includes(
                  item.value.operation as string,
                )
                  ? ''
                  : '?')}
          </span>
        </>
        <Icon
          name={IconName.ChevronsUpDown}
          className="ml-2 h-3.5 w-3.5 shrink-0"
        />
      </Button>
    </EditQueryTrigger>
  );
}

function EditQueryTrigger({
  children,
  onRemove,
  onUpdate,
  clause,
  isNew,
  onClose,
}: PropsWithChildren<{
  clause: QueryClause<QueryClauseType>;
  onRemove?: VoidFunction;
  onUpdate?: (item: QueryClause<QueryClauseType>) => void;
  isNew?: boolean;
  onClose?: VoidFunction;
}>) {
  const selectedOperations = useMemo(
    () => (clause.value.operation ? [clause.value.operation] : []),
    [clause.value.operation],
  );

  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (isNew) {
      setIsOpen(true);
    }
  }, [isNew]);

  if (!clause) {
    return null;
  }
  const canChangeOperation = clause.operations.length > 1;
  const title = canChangeOperation ? (
    clause.label
  ) : (
    <>
      {clause.label} <span className="font-mono">{clause.operationLabel}</span>
    </>
  );

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && isOpen) {
          const isEmptyAnySelection =
            clause.type === 'STRING_LIST' &&
            (clause.value.operation === 'IN' ||
              clause.value.operation === 'NOT_IN');
          if (!clause.isValid && !isEmptyAnySelection) {
            onRemove?.();
          }
          onClose?.();
        }
        setIsOpen(open);
      }}
    >
      <DropdownTrigger>{children}</DropdownTrigger>
      <DropdownPopover placement="top" className="min-w-xs!">
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            setIsOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.stopPropagation();
            }
          }}
        >
          <DropdownSection title={title}>
            {canChangeOperation && (
              <DropdownMenu
                selectable
                multiple
                selectedItems={selectedOperations}
                autoFocus={false}
                onSelect={(operations) => {
                  if (operations instanceof Set && operations.size > 0) {
                    const operation = Array.from(operations).at(
                      -1,
                    ) as QueryClauseOperationId;
                    const newClause = new QueryClause(clause.schema, {
                      ...(!['IS NULL', 'IS NOT NULL'].includes(operation) &&
                        clause.value),
                      operation,
                      fieldValue: clause.value.fieldValue,
                    });
                    Promise.resolve(newClause.schema.loadOptions?.()).then(
                      () => {
                        onUpdate?.(newClause);
                      },
                    );
                  }
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
          {clause.type === 'STRING_LIST' &&
            Number(clause.options?.length) > 1 && (
              <Button
                variant="icon"
                className="mr-2 ml-auto text-xs"
                onClick={() => {
                  if (clause.isAllSelected) {
                    const newClause = new QueryClause(
                      { ...clause.schema, options: clause.options },
                      {
                        ...clause.value,
                        value: [],
                      },
                    );
                    onUpdate?.(newClause);
                  } else {
                    const newClause = new QueryClause(
                      { ...clause.schema, options: clause.options },
                      {
                        ...clause.value,
                        value: clause.options?.map(({ value }) => value) || [],
                      },
                    );
                    onUpdate?.(newClause);
                  }
                }}
              >
                {clause.isAllSelected ? 'Deselect all' : 'Select all'}
              </Button>
            )}
          <DropdownSection>
            <ValueSelector clause={clause} onUpdate={onUpdate} />
          </DropdownSection>
          <div className="mt-1 flex items-center justify-between gap-2 px-2 pb-2">
            <Button
              variant="destructive"
              className="border-transparent bg-transparent bg-none px-4 py-1 text-red-700 shadow-none drop-shadow-none hover:bg-linear-to-b hover:text-white hover:drop-shadow-xs pressed:bg-linear-to-b pressed:text-white pressed:drop-shadow-xs"
              onClick={() => {
                if (
                  clause.id === 'status' ||
                  clause.id === 'target_service_name'
                ) {
                  const newClause = new QueryClause(
                    { ...clause.schema, options: clause.options },
                    {
                      ...clause.value,
                      operation: 'IN',
                      value: [],
                    },
                  );
                  onUpdate?.(newClause);
                } else {
                  onRemove?.();
                }
              }}
            >
              Remove
            </Button>
            <Button type="submit" variant="primary" className="px-4 py-1">
              Done
            </Button>
          </div>
        </Form>
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
              },
            );
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

  if (clause.type === 'STRING' || clause.type === 'CUSTOM_STRING') {
    if (clause.options) {
      return (
        <DropdownMenu
          autoFocus
          selectable
          shouldCloseOnSelect={false}
          selectedItems={
            typeof clause.value.value === 'string' ? [clause.value.value] : []
          }
          onSelect={(value) => {
            const newClause = new QueryClause(clause.schema, {
              ...clause.value,
              value,
            });
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
    if (['IS NULL', 'IS NOT NULL'].includes(clause.value.operation as string)) {
      return null;
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
            onUpdate?.(newClause);
          }}
          className="m-1"
          name="aaaaa"
        />
        <DropdownMenu
          autoFocus
          shouldCloseOnSelect={false}
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
  return <FocusShortcutKey className="mr-1 ml-1" />;
}
