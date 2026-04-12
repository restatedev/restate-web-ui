import { useSearchParams } from 'react-router';
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
import { OVERVIEW_MODE_PARAM } from './overviewMode';

const MODES = [
  { value: '', label: 'Service' },
  { value: 'deployments', label: 'Deployment' },
] as const;

function getCurrentLabel(searchParams: URLSearchParams) {
  const mode = searchParams.get(OVERVIEW_MODE_PARAM);
  return mode === 'deployments' ? 'Deployment' : 'Service';
}

export function OverviewModeToggle() {
  const [searchParams, setSearchParams] = useSearchParams();
  const label = getCurrentLabel(searchParams);
  const currentMode = searchParams.get(OVERVIEW_MODE_PARAM) ?? '';

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="secondary"
          className="flex shrink-0 items-stretch gap-0 overflow-hidden p-0 text-sm font-normal"
        >
          <span className="flex items-center border-r border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-400">
            Group by
          </span>
          <span className="flex items-center gap-0.5 px-2 py-1 text-gray-600">
            {label}
            <Icon
              name={IconName.ChevronsUpDown}
              className="h-4 w-4 text-gray-400"
            />
          </span>
        </Button>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownSection title="Group by">
          <DropdownMenu
            selectable
            selectedItems={[currentMode]}
            onSelect={(key) => {
              setSearchParams((prev) => {
                prev.delete(OVERVIEW_MODE_PARAM);
                if (key) prev.set(OVERVIEW_MODE_PARAM, key);
                return prev;
              });
            }}
            aria-label="Group by"
          >
            {MODES.map((mode) => (
              <DropdownItem key={mode.value} value={mode.value}>
                {mode.label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}
