import { Icon, IconName } from '@restate/ui/icons';
import {
  Dropdown,
  DropdownTrigger,
  DropdownPopover,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from '@restate/ui/dropdown';
import { Button } from '@restate/ui/button';
import { useOverviewContext } from './OverviewContext';

const SERVICE_SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'invocations', label: 'Invocations' },
  { value: 'health', label: 'Issues' },
] as const;

const DEPLOYMENT_SORT_OPTIONS = [
  { value: 'deployment', label: 'Endpoint' },
  { value: 'created_at', label: 'Created at' },
  { value: 'status', label: 'Status' },
] as const;

function getSortLabel(column: string | undefined, mode: string) {
  const options =
    mode === 'deployments' ? DEPLOYMENT_SORT_OPTIONS : SERVICE_SORT_OPTIONS;
  return options.find((o) => o.value === column)?.label ?? options[0]?.label;
}

export function SortByDropdown() {
  const {
    mode,
    resolvedServiceSortDescriptor,
    resolvedDeploymentSortDescriptor,
    setServiceSortDescriptor,
    setDeploymentSortDescriptor,
  } = useOverviewContext();

  const sortDescriptor =
    mode === 'deployments'
      ? resolvedDeploymentSortDescriptor
      : resolvedServiceSortDescriptor;
  const setSortDescriptor =
    mode === 'deployments'
      ? setDeploymentSortDescriptor
      : setServiceSortDescriptor;
  const options =
    mode === 'deployments' ? DEPLOYMENT_SORT_OPTIONS : SERVICE_SORT_OPTIONS;
  const label = getSortLabel(String(sortDescriptor.column), mode);
  const currentColumn = String(sortDescriptor.column);

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="secondary"
          className="flex shrink-0 items-stretch gap-0 overflow-hidden rounded-lg p-0 text-0.5xs"
        >
          <span className="flex items-center border-r border-gray-200 bg-gray-50 px-2 py-0.5 text-gray-400">
            Sort by
          </span>
          <span className="flex items-center gap-0.5 py-0.5 pr-1 pl-2">
            {label}
            <Icon
              name={IconName.ChevronsUpDown}
              className="ml-0.5 aspect-square h-3.5 w-3.5 opacity-80"
            />
          </span>
        </Button>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownSection title="Sort by">
          <DropdownMenu
            selectable
            selectedItems={[currentColumn]}
            onSelect={(key) => {
              setSortDescriptor({
                column: key,
                direction:
                  key === 'name' || key === 'deployment'
                    ? 'ascending'
                    : 'descending',
              });
            }}
            aria-label="Sort by"
          >
            {options.map((option) => (
              <DropdownItem key={option.value} value={option.value}>
                {option.label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}
