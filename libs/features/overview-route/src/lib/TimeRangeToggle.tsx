import {
  Dropdown,
  DropdownTrigger,
  DropdownPopover,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from '@restate/ui-dropdown';
import { ChartContextTrigger } from '@restate/features-status-chart';
import type { CompletionTimeRange } from './completionBuckets';

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
