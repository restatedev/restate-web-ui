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

const DIRECTION_OPTIONS = [
  {
    value: 'ascending',
    label: 'Ascending',
    icon: IconName.ArrowUp,
  },
  {
    value: 'descending',
    label: 'Descending',
    icon: IconName.ArrowDown,
  },
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
  const currentDirection =
    sortDescriptor.direction === 'descending' ? 'descending' : 'ascending';
  const currentDirectionIcon =
    currentDirection === 'ascending' ? IconName.ArrowUp : IconName.ArrowDown;

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
              name={currentDirectionIcon}
              className="ml-0.5 h-3.5 w-3.5 opacity-80"
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
                direction: currentDirection,
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
        <DropdownSection title="Direction">
          <DropdownMenu
            selectable
            selectedItems={[currentDirection]}
            onSelect={(key) => {
              setSortDescriptor({
                column: currentColumn,
                direction: key === 'descending' ? 'descending' : 'ascending',
              });
            }}
            aria-label="Sort direction"
          >
            {DIRECTION_OPTIONS.map((option) => (
              <DropdownItem key={option.value} value={option.value}>
                <span className="flex items-center gap-2">
                  <Icon name={option.icon} className="h-3.5 w-3.5" />
                  {option.label}
                </span>
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}
