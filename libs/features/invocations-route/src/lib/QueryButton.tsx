import { Button } from '@restate/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import { Dispatch, ReactNode, SetStateAction } from 'react';
import {
  SORT_COLUMN_KEYS,
  SORT_NONE,
  type SortSelection,
} from './useInvocationsQueryFilters';

const SORT_FIELD_LABELS: Record<
  Exclude<SortSelection['field'], typeof SORT_NONE>,
  string
> = {
  created_at: 'Created at',
};

type QueryButtonVariant = 'filterBar' | 'toolbar';

const queryButtonStyles = tv({
  slots: {
    button: 'flex shrink-0 items-center rounded-lg',
    operation: 'font-mono',
    field: 'shrink-0 whitespace-nowrap',
    value: 'font-semibold',
    chevron: 'h-3.5 w-3.5 shrink-0',
  },
  variants: {
    variant: {
      filterBar: {
        button:
          'min-w-0 gap-[0.7ch] bg-white/25 px-1.5 py-1 text-xs text-zinc-50 hover:bg-white/30 pressed:bg-white/30',
        value: 'truncate',
        chevron: 'ml-2',
      },
      toolbar: {
        button: 'gap-1.5 p-0.5 px-2 text-0.5xs',
        value: 'font-medium whitespace-nowrap',
        chevron: 'opacity-80',
      },
    },
  },
  defaultVariants: {
    variant: 'filterBar',
  },
});

function QueryButton({
  operation,
  field,
  value,
  variant,
}: {
  operation: ReactNode;
  field: ReactNode;
  value?: ReactNode;
  variant?: QueryButtonVariant;
}) {
  const s = queryButtonStyles({ variant });
  return (
    <Button variant="secondary" className={s.button()}>
      {operation != null && (
        <span className={s.operation()}>{operation}</span>
      )}
      {field != null && <span className={s.field()}>{field}</span>}
      {value != null && <span className={s.value()}>{value}</span>}
      <Icon name={IconName.ChevronsUpDown} className={s.chevron()} />
    </Button>
  );
}

export function Sort({
  setSortParams,
  sortParams,
  variant,
}: {
  sortParams: SortSelection;
  setSortParams: Dispatch<SetStateAction<SortSelection>>;
  variant?: QueryButtonVariant;
}) {
  const isNone = sortParams.field === SORT_NONE;
  return (
    <Dropdown>
      <DropdownTrigger>
        <QueryButton
          variant={variant}
          field={isNone ? 'No sorting' : 'Sort by'}
          value={
            sortParams.field === SORT_NONE
              ? undefined
              : SORT_FIELD_LABELS[sortParams.field]
          }
          operation={
            isNone ? (
              <Icon name={IconName.Minus} className="h-3.5 w-3.5" />
            ) : (
              <Icon
                name={
                  sortParams.order === 'ASC'
                    ? IconName.ArrowUp
                    : IconName.ArrowDown
                }
                className="h-3.5 w-3.5"
              />
            )
          }
        />
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownSection title="Sort by">
          <DropdownMenu
            selectable
            selectedItems={[sortParams?.field]}
            onSelect={(value) =>
              setSortParams((sortParams) => ({
                ...sortParams,
                field: value as SortSelection['field'],
              }))
            }
          >
            <DropdownItem key={SORT_NONE} value={SORT_NONE}>
              No sorting
            </DropdownItem>
            {SORT_COLUMN_KEYS.map((item) => (
              <DropdownItem key={item} value={item}>
                {SORT_FIELD_LABELS[item]}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
        {!isNone && (
          <DropdownSection>
            <DropdownMenu
              selectable
              selectedItems={[sortParams?.order]}
              onSelect={(value) =>
                setSortParams((sortParams) => ({
                  ...sortParams,
                  order: value as SortSelection['order'],
                }))
              }
            >
              <DropdownItem value="ASC">Ascending</DropdownItem>
              <DropdownItem value="DESC">Descending</DropdownItem>
            </DropdownMenu>
          </DropdownSection>
        )}
      </DropdownPopover>
    </Dropdown>
  );
}
