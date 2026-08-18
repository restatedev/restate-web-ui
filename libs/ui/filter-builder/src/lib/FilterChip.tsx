import { Button } from '@restate/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import {
  FormFieldDateTimeInput,
  FormFieldDateTimeRangeInput,
  FormFieldInput,
  FormFieldNumberInput,
} from '@restate/ui/form-field';
import { Icon, IconName } from '@restate/ui/icons';
import {
  QueryClause,
  QueryClauseDateRangeValue,
  QueryClauseOperationId,
  QueryClauseOption,
  QueryClauseType,
  queryClauseOperationRequiresValue,
  useFinishNewQuery,
  useNewQueryId,
} from '@restate/ui/query-builder';
import { tv } from '@restate/util/styles';
import {
  PropsWithChildren,
  ReactNode,
  RefObject,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Form } from 'react-router';

const chipStyles = tv({
  base: 'inline-flex min-w-0 items-center',
  variants: {
    appearance: {
      dark: 'contents',
      light: 'rounded-lg border border-blue-200 bg-blue-50 shadow-xs',
    },
  },
});

const chipButtonStyles = tv({
  base: 'flex min-w-0 items-center text-xs',
  variants: {
    appearance: {
      dark: 'gap-[0.7ch] rounded-lg bg-white/25 px-1.5 py-1 text-zinc-50 hover:bg-white/30 pressed:bg-white/30',
      light:
        'min-h-[1.625rem] gap-1 rounded-lg border-transparent bg-transparent px-1 py-0 text-blue-950 shadow-none hover:bg-blue-100 pressed:bg-blue-200',
    },
    hasRemove: {
      true: '',
    },
  },
  compoundVariants: [
    {
      appearance: 'light',
      hasRemove: true,
      className: 'rounded-r-none',
    },
  ],
});

const chipValueStyles = tv({
  base: 'min-w-0 truncate',
  variants: {
    appearance: {
      dark: 'max-w-56 font-semibold',
      light: [
        'ml-0.5 max-w-28 font-medium',
        '[&_[data-chip-group]>*:not(:first-child)]:-ml-1!',
        '[&_[data-chip]]:[--chip-height:1.25rem]',
        '[&_[data-chip]]:[--chip-radius:0.375rem]',
        '[&_[data-chip]_[data-chip-segment]:first-child_[data-chip-segment-inner]]:pl-0.5',
        '[&_[data-chip]_[data-chip-segment]:first-child_[data-chip-segment-inner]:has(svg)]:pl-1.5',
      ],
    },
    isRichValue: {
      true: '',
      false: '',
    },
  },
  compoundVariants: [
    {
      appearance: 'light',
      isRichValue: false,
      className:
        'rounded-md border border-blue-200 bg-white px-1 py-0.5 font-mono text-zinc-700 shadow-xs',
    },
  ],
});

const chipLabelStyles = tv({
  base: 'shrink-0 whitespace-nowrap',
  variants: {
    appearance: {
      dark: '',
      light: 'font-medium text-blue-950',
    },
  },
});

const chipOperationStyles = tv({
  base: 'shrink-0 font-mono',
  variants: {
    appearance: {
      dark: '',
      light: 'font-normal text-blue-600',
    },
  },
});

const filterIconStyles = tv({
  base: 'h-3.5 w-3.5 shrink-0',
  variants: {
    appearance: {
      dark: 'text-current opacity-70',
      light: 'text-blue-600',
    },
  },
});

const chevronStyles = tv({
  base: 'h-3.5 w-3.5 shrink-0',
  variants: {
    appearance: {
      dark: 'ml-1',
      light: 'ml-0.5',
    },
  },
});

const chipPopoverStyles = tv({
  base: 'min-w-xs!',
});

export interface FilterChipProps {
  item: QueryClause<QueryClauseType>;
  onRemove?: VoidFunction;
  onUpdate?: (item: QueryClause<QueryClauseType>) => void;
  formRef?: RefObject<HTMLFormElement | null>;
  emptyValueLabel?: string;
  appearance?: 'dark' | 'light';
  showRemove?: boolean;
  popoverPlacement?: 'top' | 'bottom';
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  valueClassName?: string;
  popoverClassName?: string;
  renderValue?: (item: QueryClause<QueryClauseType>) => ReactNode;
  renderOption?: (
    option: QueryClauseOption,
    item: QueryClause<QueryClauseType>,
  ) => ReactNode;
}

export function FilterChip({
  item,
  onRemove,
  onUpdate,
  formRef,
  emptyValueLabel,
  appearance = 'dark',
  showRemove = false,
  popoverPlacement = 'top',
  disabled = false,
  className,
  buttonClassName,
  valueClassName,
  popoverClassName,
  renderValue,
  renderOption,
}: FilterChipProps) {
  const isNew = useNewQueryId() === item.id;
  const finishNew = useFinishNewQuery();
  const submit = () => setTimeout(() => formRef?.current?.requestSubmit(), 0);
  const close = () => {
    finishNew();
    submit();
  };

  return (
    <div className={chipStyles({ appearance, className })}>
      <EditFilterTrigger
        clause={item}
        onRemove={onRemove}
        onUpdate={onUpdate}
        onClose={close}
        isNew={isNew}
        popoverPlacement={popoverPlacement}
        popoverClassName={popoverClassName}
        renderOption={renderOption}
      >
        <Button
          autoFocus={isNew}
          data-filter-id={item.id}
          variant="secondary"
          disabled={disabled}
          className={chipButtonStyles({
            appearance,
            hasRemove: showRemove,
            className: buttonClassName,
          })}
        >
          <Icon
            name={IconName.Filter}
            className={filterIconStyles({ appearance })}
          />
          <span className={chipLabelStyles({ appearance })}>{item.label}</span>
          {item.operationLabel?.split(' ').map((segment) => (
            <span className={chipOperationStyles({ appearance })} key={segment}>
              {segment}
            </span>
          ))}
          <span
            className={chipValueStyles({
              appearance,
              isRichValue: Boolean(renderValue),
              className: valueClassName,
            })}
          >
            {renderValue
              ? renderValue(item)
              : item.type === 'STRING_LIST' &&
                  (!item.value.operation || item.value.operation === 'IN') &&
                  (item.isAllSelected || item.isNothingSelected)
                ? 'Any'
                : item.valueLabel ||
                  (queryClauseOperationRequiresValue(item.value.operation)
                    ? (emptyValueLabel ?? '?')
                    : '')}
          </span>
          <Icon
            name={
              appearance === 'light'
                ? IconName.ChevronDown
                : IconName.ChevronsUpDown
            }
            className={chevronStyles({ appearance })}
          />
        </Button>
      </EditFilterTrigger>
      {showRemove && onRemove && (
        <Button
          type="button"
          variant="icon"
          aria-label={`Remove ${item.label} filter`}
          className="min-h-[1.625rem] self-stretch rounded-l-none rounded-r-lg border-l border-blue-200 px-1 py-0 text-blue-500 hover:bg-blue-100 hover:text-blue-700 pressed:bg-blue-200"
          onClick={() => {
            onRemove();
            submit();
          }}
        >
          <Icon name={IconName.X} className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function EditFilterTrigger({
  children,
  onRemove,
  onUpdate,
  clause,
  isNew,
  onClose,
  popoverPlacement,
  popoverClassName,
  renderOption,
}: PropsWithChildren<{
  clause: QueryClause<QueryClauseType>;
  onRemove?: VoidFunction;
  onUpdate?: (item: QueryClause<QueryClauseType>) => void;
  isNew?: boolean;
  onClose?: VoidFunction;
  popoverPlacement: 'top' | 'bottom';
  popoverClassName?: string;
  renderOption?: (
    option: QueryClauseOption,
    item: QueryClause<QueryClauseType>,
  ) => ReactNode;
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

  const finish = () => {
    onClose?.();
    setIsOpen(false);
  };

  const close = () => {
    const isEmptyAnySelection =
      clause.type === 'STRING_LIST' &&
      (clause.value.operation === 'IN' || clause.value.operation === 'NOT_IN');
    if (!clause.isValid && !isEmptyAnySelection) {
      onRemove?.();
    }
    finish();
  };

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
          close();
        } else {
          setIsOpen(open);
        }
      }}
    >
      <DropdownTrigger>{children}</DropdownTrigger>
      <DropdownPopover
        placement={popoverPlacement}
        className={chipPopoverStyles({ className: popoverClassName })}
      >
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            close();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Backspace') {
              event.stopPropagation();
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
                    const requiresValue =
                      queryClauseOperationRequiresValue(operation);
                    const newClause = new QueryClause(clause.schema, {
                      operation,
                      ...(requiresValue && {
                        value: getValueForOperation(clause, operation),
                      }),
                      fieldValue: clause.value.fieldValue,
                    });
                    Promise.resolve(newClause.schema.loadOptions?.()).then(() =>
                      onUpdate?.(newClause),
                    );
                  }
                }}
              >
                {clause.operations.map((operation) => (
                  <DropdownItem value={operation.value} key={operation.value}>
                    {operation.label}
                    {operation.description}
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
                  const value = clause.isAllSelected
                    ? []
                    : clause.options?.map(({ value }) => value) || [];
                  onUpdate?.(
                    new QueryClause(
                      { ...clause.schema, options: clause.options },
                      { ...clause.value, value },
                    ),
                  );
                }}
              >
                {clause.isAllSelected ? 'Deselect all' : 'Select all'}
              </Button>
            )}
          <DropdownSection>
            <ValueSelector
              clause={clause}
              onUpdate={onUpdate}
              renderOption={renderOption}
            />
          </DropdownSection>
          <div className="mt-1 flex items-center justify-between gap-2 px-2 pb-2">
            {onRemove ? (
              <Button
                variant="destructive"
                className="border-transparent bg-transparent bg-none px-4 py-1 text-red-700 shadow-none drop-shadow-none hover:bg-linear-to-b hover:text-white hover:drop-shadow-xs pressed:bg-linear-to-b pressed:text-white pressed:drop-shadow-xs"
                onClick={() => {
                  onRemove();
                  finish();
                }}
              >
                Remove
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" variant="primary" className="px-4 py-1">
              Done
            </Button>
          </div>
        </Form>
      </DropdownPopover>
    </Dropdown>
  );
}

function isDateRangeValue(value: unknown): value is QueryClauseDateRangeValue {
  return (
    value != null &&
    typeof value === 'object' &&
    ('start' in value || 'end' in value)
  );
}

function getValueForOperation(
  clause: QueryClause<QueryClauseType>,
  operation: QueryClauseOperationId,
) {
  if (clause.type !== 'DATE') {
    return clause.value.value;
  }
  const value = clause.value.value;
  if (operation === 'BETWEEN') {
    return isDateRangeValue(value) ? value : { start: value as Date };
  }
  if (isDateRangeValue(value)) {
    return operation === 'BEFORE' ? value.end : value.start;
  }
  return value;
}

function ValueSelector({
  clause,
  onUpdate,
  renderOption,
}: {
  clause: QueryClause<QueryClauseType>;
  onUpdate?: (item: QueryClause<QueryClauseType>) => void;
  renderOption?: (
    option: QueryClauseOption,
    item: QueryClause<QueryClauseType>,
  ) => ReactNode;
}) {
  if (clause.type === 'STRING_LIST' && clause.options) {
    return (
      <DropdownMenu
        autoFocus
        selectable
        multiple
        selectedItems={clause.value.value as string[]}
        onSelect={(values) => {
          onUpdate?.(
            new QueryClause(
              { ...clause.schema, options: clause.options },
              { ...clause.value, value: Array.from(values as Set<string>) },
            ),
          );
        }}
        className="max-h-96"
      >
        {clause.options.map((option) => (
          <DropdownItem value={option.value} key={option.value}>
            {renderOption ? (
              renderOption(option, clause)
            ) : (
              <div className="flex flex-col gap-0.5">
                {option.label}
                <div className="text-xs opacity-80">{option.description}</div>
              </div>
            )}
          </DropdownItem>
        ))}
      </DropdownMenu>
    );
  }

  if (clause.type === 'STRING' || clause.type === 'CUSTOM_STRING') {
    if (!queryClauseOperationRequiresValue(clause.value.operation)) {
      return null;
    }
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
            onUpdate?.(
              new QueryClause(clause.schema, { ...clause.value, value }),
            );
          }}
        >
          {clause.options.map((option) => (
            <DropdownItem value={option.value} key={option.value}>
              {renderOption ? (
                renderOption(option, clause)
              ) : (
                <div className="flex flex-col gap-0.5">
                  {option.label}
                  <div className="text-xs opacity-80">{option.description}</div>
                </div>
              )}
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
          onUpdate?.(
            new QueryClause(clause.schema, { ...clause.value, value }),
          );
        }}
        className="m-1 [&_label]:hidden"
      />
    );
  }

  if (clause.type === 'KEY_VALUE') {
    return (
      <>
        <FormFieldInput
          autoFocus={!clause.value.fieldValue}
          label="Key"
          placeholder="Key"
          value={clause.value.fieldValue ?? ''}
          onChange={(fieldValue) => {
            onUpdate?.(
              new QueryClause(clause.schema, {
                ...clause.value,
                fieldValue,
              }),
            );
          }}
          className="m-1 [&_label]:hidden"
        />
        {queryClauseOperationRequiresValue(clause.value.operation) && (
          <FormFieldInput
            autoFocus={Boolean(clause.value.fieldValue)}
            label="Value"
            placeholder="Value"
            value={clause.value.value as string}
            onChange={(value) => {
              onUpdate?.(
                new QueryClause(clause.schema, { ...clause.value, value }),
              );
            }}
            className="m-1 [&_label]:hidden"
          />
        )}
      </>
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
          onUpdate?.(
            new QueryClause(clause.schema, { ...clause.value, value }),
          );
        }}
        className="m-1 [&_label]:hidden"
      />
    );
  }

  if (clause.type === 'DATE') {
    if (clause.value.operation === 'BETWEEN') {
      const value = isDateRangeValue(clause.value.value)
        ? clause.value.value
        : { start: clause.value.value as Date | undefined };
      return (
        <>
          <FormFieldDateTimeRangeInput
            autoFocus
            placeholder={clause.label}
            placeholderValue={new Date().toISOString()}
            value={{
              start: value.start?.toISOString(),
              end: value.end?.toISOString(),
            }}
            onChange={(nextValue) => {
              const range =
                nextValue?.start && nextValue.end
                  ? {
                      start: new Date(nextValue.start),
                      end: new Date(nextValue.end),
                    }
                  : undefined;
              onUpdate?.(
                new QueryClause(clause.schema, {
                  ...clause.value,
                  value: range,
                }),
              );
            }}
            className="m-1 w-[32rem] max-w-[calc(100vw-2rem)]"
          />
          <RelativeDateOptions clause={clause} onUpdate={onUpdate} range />
        </>
      );
    }
    return (
      <>
        <FormFieldDateTimeInput
          placeholder={clause.label}
          placeholderValue={new Date().toISOString()}
          value={(clause.value.value as Date)?.toISOString()}
          onChange={(value) => {
            onUpdate?.(
              new QueryClause(clause.schema, {
                ...clause.value,
                value: value ? new Date(value) : undefined,
              }),
            );
          }}
          className="m-1"
        />
        <RelativeDateOptions clause={clause} onUpdate={onUpdate} />
      </>
    );
  }

  return null;
}

function RelativeDateOptions({
  clause,
  onUpdate,
  range = false,
}: {
  clause: QueryClause<QueryClauseType>;
  onUpdate?: (item: QueryClause<QueryClauseType>) => void;
  range?: boolean;
}) {
  return (
    <DropdownMenu
      autoFocus={!range}
      shouldCloseOnSelect={false}
      className={range ? 'border-t border-gray-100 pt-1' : undefined}
      onSelect={(selectedValue) => {
        const multiplier: Record<string, number> = {
          '1m': 1,
          '1h': 60,
          '1D': 60 * 24,
        };
        const end = new Date();
        const start = new Date(
          end.getTime() - 60 * 1000 * (multiplier[String(selectedValue)] ?? 1),
        );
        onUpdate?.(
          new QueryClause(clause.schema, {
            ...clause.value,
            value: range ? { start, end } : start,
          }),
        );
      }}
    >
      <DropdownItem value="1m">
        {range ? 'Last minute' : '1min ago'}
      </DropdownItem>
      <DropdownItem value="1h">{range ? 'Last hour' : '1h ago'}</DropdownItem>
      <DropdownItem value="1D">{range ? 'Last day' : '1day ago'}</DropdownItem>
    </DropdownMenu>
  );
}
