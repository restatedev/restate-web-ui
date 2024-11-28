import { Invocation, useListInvocations } from '@restate/data-access/admin-api';
import { Button } from '@restate/ui/button';
import { Column, Row, Table, TableBody, TableHeader } from '@restate/ui/table';
import { useCollator } from 'react-aria';
import { useAsyncList } from 'react-stately';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { COLUMN_NAMES, ColumnKey, useColumns } from './columns';
import { InvocationCell } from './cells';

function Component() {
  const { selectedColumns, setSelectedColumns, sortedColumnsList } =
    useColumns();
  const { mutateAsync: refetch } = useListInvocations();
  const collator = useCollator();
  const invocations = useAsyncList<Invocation>({
    async load() {
      const results = await refetch({});
      return { items: results?.rows ?? [] };
    },
    async sort({ items, sortDescriptor }) {
      return {
        items: items.sort((a, b) => {
          let cmp = 0;

          if (sortDescriptor.column === 'type') {
            cmp = collator.compare(
              a.target_service_ty + (a.target_service_key ?? ''),
              b.target_service_ty + (b.target_service_key ?? '')
            );
          } else {
            cmp = collator.compare(
              a[sortDescriptor.column as Exclude<ColumnKey, 'type'>],
              b[sortDescriptor.column as Exclude<ColumnKey, 'type'>]
            );
          }

          // Flip the direction if descending order is specified.
          if (sortDescriptor.direction === 'descending') {
            cmp *= -1;
          }

          return cmp;
        }),
      };
    },
  });

  return (
    <div className="flex flex-col flex-auto gap-2 h-[calc(100vh-9rem-10rem)]">
      <Dropdown>
        <DropdownTrigger>
          <Button variant="secondary" className="px-2 self-end">
            <Icon
              name={IconName.TableProperties}
              className="h-5 w-5 aspect-square text-gray-500"
            />
          </Button>
        </DropdownTrigger>
        <DropdownPopover>
          <DropdownSection title="Columns">
            <DropdownMenu
              multiple
              selectable
              selectedItems={selectedColumns}
              onSelect={setSelectedColumns}
            >
              {Object.entries(COLUMN_NAMES).map(([key, name]) => (
                <DropdownItem key={key} value={key}>
                  {name}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </DropdownSection>
        </DropdownPopover>
      </Dropdown>
      <Table
        aria-label="Invocations"
        sortDescriptor={invocations.sortDescriptor}
        onSortChange={invocations.sort}
        className="shadow-sm"
      >
        <TableHeader
          columns={sortedColumnsList.map((id, index) => ({
            name: COLUMN_NAMES[id],
            id,
            isRowHeader: index === 0,
          }))}
        >
          {(col) => (
            <Column id={col.id} isRowHeader={col.isRowHeader} allowsSorting>
              {col.name}
            </Column>
          )}
        </TableHeader>
        <TableBody
          items={invocations.items}
          dependencies={[
            selectedColumns,
            invocations.isLoading,
            invocations.error,
          ]}
          error={invocations.error}
          isLoading={invocations.isLoading}
          numOfColumns={sortedColumnsList.length}
          emptyPlaceholder={
            <div className="flex flex-col items-center py-14 gap-4">
              <div className="mr-1.5 shrink-0 h-12 w-12 p-1 bg-gray-100 rounded-xl">
                <Icon
                  name={IconName.Invocation}
                  className="w-full h-full text-zinc-400 p-1"
                />
              </div>
              <h3 className="text-sm font-semibold text-zinc-400">
                No invocations found
              </h3>
            </div>
          }
        >
          {(row) => (
            <Row>
              {sortedColumnsList.map((col) => (
                <InvocationCell key={col} column={col} invocation={row} />
              ))}
            </Row>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export const invocations = { Component };
