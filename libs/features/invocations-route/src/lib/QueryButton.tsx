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
import { COLUMN_NAMES, ColumnKey } from './columns';
import { SortInvocations } from '@restate/data-access/admin-api/spec';
import { Dispatch, ReactNode, SetStateAction } from 'react';
import { SORT_COLUMN_KEYS } from './useInvocationsQueryFilters';

function QueryButton({
  operation,
  field,
  value,
}: {
  operation: ReactNode;
  field: ReactNode;
  value?: ReactNode;
}) {
  return (
    <Button
      variant="secondary"
      className="flex min-w-0 shrink-0 items-center gap-[0.7ch] rounded-lg bg-white/25 px-1.5 py-1 text-xs text-zinc-50 hover:bg-white/30 pressed:bg-white/30"
    >
      <span className="shrink-0 whitespace-nowrap">{field}</span>
      <span className="font-mono">{operation}</span>
      <span className="truncate font-semibold">{value}</span>
      <Icon
        name={IconName.ChevronsUpDown}
        className="ml-2 h-3.5 w-3.5 shrink-0"
      />
    </Button>
  );
}

export function Sort({
  setSortParams,
  sortParams,
}: {
  sortParams: SortInvocations;
  setSortParams: Dispatch<SetStateAction<SortInvocations>>;
}) {
  console.log(sortParams);
  return (
    <Dropdown>
      <DropdownTrigger>
        <QueryButton
          field=""
          value={COLUMN_NAMES[sortParams.field]}
          operation={
            <Icon
              name={
                sortParams.order === 'ASC' ? IconName.MoveUp : IconName.MoveDown
              }
              className="-ml-2 h-4 w-4"
            />
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
                field: value as SortInvocations['field'],
              }))
            }
          >
            {SORT_COLUMN_KEYS.map((item) => (
              <DropdownItem key={item} value={item}>
                {COLUMN_NAMES[item]}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
        <DropdownSection>
          <DropdownMenu
            selectable
            selectedItems={[sortParams?.order]}
            onSelect={(value) =>
              setSortParams((sortParams) => ({
                ...sortParams,
                order: value as SortInvocations['order'],
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
