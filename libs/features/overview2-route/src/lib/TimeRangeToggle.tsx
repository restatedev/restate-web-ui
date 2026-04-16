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
import { OVERVIEW_RANGE_PARAM, PeriodRange } from './useRangeFilters';

const RANGES = [
  { value: '', param: undefined, label: 'in last 1h' },
  { value: PeriodRange.P1D, param: PeriodRange.P1D, label: 'in last 24h' },
  { value: PeriodRange.ALL, param: PeriodRange.ALL, label: 'overall' },
] as const;

function getCurrentLabel(searchParams: URLSearchParams) {
  const range = searchParams.get(OVERVIEW_RANGE_PARAM);
  if (range === PeriodRange.P1D) return 'in last 24h';
  if (range === PeriodRange.ALL) return 'overall';
  return 'in last 1h';
}

export function TimeRangeToggle({ onChange }: { onChange?: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const label = getCurrentLabel(searchParams);
  const currentRange = searchParams.get(OVERVIEW_RANGE_PARAM) ?? '';

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="secondary"
          className="flex shrink-0 items-center gap-0.5 bg-gray-50 py-0.5 pr-1.5 pl-2 text-sm font-normal text-gray-500"
        >
          {label}
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-3.5 w-3.5 text-gray-500"
          />
        </Button>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownSection title="Time range">
          <DropdownMenu
            selectable
            selectedItems={[currentRange]}
            onSelect={(key) => {
              onChange?.();
              setSearchParams((prev) => {
                prev.delete(OVERVIEW_RANGE_PARAM);
                if (key) prev.set(OVERVIEW_RANGE_PARAM, key);
                return prev;
              });
            }}
            aria-label="Time range"
          >
            {RANGES.map((range) => (
              <DropdownItem key={range.value} value={range.value}>
                {range.label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}
