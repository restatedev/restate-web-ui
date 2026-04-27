import type { ReactNode } from 'react';
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
  { value: 'created_at', label: 'Created at' },
  { value: 'invocations', label: 'Invocations' },
  { value: 'health', label: 'Issues' },
] as const;

const DEPLOYMENT_SORT_OPTIONS = [
  { value: 'deployment', label: 'Endpoint' },
  { value: 'created_at', label: 'Created at' },
  { value: 'status', label: 'Status' },
] as const;

type ServiceSortOption = (typeof SERVICE_SORT_OPTIONS)[number];

function getSortLabel(
  column: string | undefined,
  mode: string,
  formatServiceSortLabel?: (option: ServiceSortOption) => ReactNode,
) {
  if (mode === 'deployments') {
    return (
      DEPLOYMENT_SORT_OPTIONS.find((o) => o.value === column)?.label ??
      DEPLOYMENT_SORT_OPTIONS[0].label
    );
  }
  const option =
    SERVICE_SORT_OPTIONS.find((o) => o.value === column) ??
    SERVICE_SORT_OPTIONS[0];
  return formatServiceSortLabel?.(option) ?? option.label;
}

export function SortByDropdown({
  formatServiceSortLabel,
}: {
  formatServiceSortLabel?: (option: ServiceSortOption) => ReactNode;
}) {
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
  const label = getSortLabel(
    String(sortDescriptor.column),
    mode,
    formatServiceSortLabel,
  );
  const currentColumn = String(sortDescriptor.column);
  const currentDirection =
    sortDescriptor.direction === 'descending' ? 'descending' : 'ascending';
  const currentDirectionIcon =
    currentDirection === 'ascending' ? IconName.ArrowUp : IconName.ArrowDown;

  return (
    <div className="group flex shrink-0 items-stretch text-0.5xs">
      <Dropdown>
        <DropdownTrigger>
          <Button
            variant="secondary"
            className="flex items-stretch gap-0 overflow-hidden rounded-lg rounded-r-none p-0 text-0.5xs group-focus-within:z-2"
          >
            <span className="flex items-center border-r border-gray-200 bg-gray-50 px-2 py-0.5 text-gray-500/80">
              Sort by
            </span>
            <span className="flex items-center gap-0.5 py-0.5 pr-2 pl-2">
              {label}
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
                  {getSortLabel(option.value, mode, formatServiceSortLabel)}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </DropdownSection>
        </DropdownPopover>
      </Dropdown>
      <Button
        variant="secondary"
        className="-ml-px flex items-center rounded-lg rounded-l-none px-1 py-0.5 text-gray-800"
        onClick={() => {
          setSortDescriptor({
            column: currentColumn,
            direction:
              currentDirection === 'ascending' ? 'descending' : 'ascending',
          });
        }}
      >
        <Icon name={currentDirectionIcon} className="h-3.5 w-3.5 opacity-80" />
      </Button>
    </div>
  );
}
