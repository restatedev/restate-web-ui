import {
  Dropdown,
  DropdownTrigger,
  DropdownPopover,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from '@restate/ui/dropdown';
import { ChartContextTrigger } from '@restate/features/status-chart';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import {
  DEFAULT_RANGE,
  getRangeLabel,
  useRange,
  useSetRange,
} from '@restate/features/restate-context';
import {
  normalizeCompletionTimeRange,
  type CompletionTimeRange,
} from './completionBuckets';

const COMPLETION_RANGES = [
  { value: 'PT1H', label: '1h', contextLabel: 'Past hour' },
  { value: 'P1D', label: '24h', contextLabel: 'Past 24 hours' },
  { value: 'ALL', label: 'Overall', contextLabel: 'Overall' },
] as const;

export function CompletionTimeRangeToggle({
  value,
  onChange,
}: {
  value: CompletionTimeRange;
  onChange: (value: CompletionTimeRange) => void;
}) {
  const contextLabel =
    COMPLETION_RANGES.find((range) => range.value === value)?.contextLabel ??
    'Past hour';

  return (
    <Dropdown>
      <DropdownTrigger>
        <ChartContextTrigger>{contextLabel}</ChartContextTrigger>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownSection title="Completed time range">
          <DropdownMenu
            selectable
            selectedItems={[value]}
            onSelect={(key) => key && onChange(key as CompletionTimeRange)}
            aria-label="Completed time range"
          >
            {COMPLETION_RANGES.map((range) => (
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

export function OverviewTimeRangeToggle() {
  const range = useRange();
  const setRange = useSetRange();
  const timeRange = normalizeCompletionTimeRange(range);

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="secondary"
          className="flex shrink-0 items-center gap-0.5 bg-gray-50 py-0.5 pr-1.5 pl-2 text-sm font-normal text-gray-500"
        >
          {getRangeLabel(timeRange)}
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
            selectedItems={[timeRange]}
            onSelect={(key) => setRange(key || DEFAULT_RANGE)}
            aria-label="Time range"
          >
            {COMPLETION_RANGES.map((item) => (
              <DropdownItem key={item.value} value={item.value}>
                {getRangeLabel(item.value)}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}
