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
import {
  DEFAULT_RANGE,
  getRangeLabel,
  PeriodRange,
  useRange,
  useSetRange,
} from '@restate/features/restate-context';

const RANGES = [
  { value: PeriodRange.PT1H, label: 'in last 1h' },
  { value: PeriodRange.P1D, label: 'in last 24h' },
  { value: PeriodRange.ALL, label: 'overall' },
] as const;

export function TimeRangeToggle({ onChange }: { onChange?: () => void }) {
  const currentRange = useRange();
  const setRange = useSetRange();
  const label = getRangeLabel(currentRange);

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
              setRange(key || DEFAULT_RANGE);
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
