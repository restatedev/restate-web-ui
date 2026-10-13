import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import type { BreakdownCountMode } from '@restate/features/user-preference';
import { ChartControlTrigger, ChartControlValue } from './ChartControlTrigger';

export function BreakdownMode({
  mode,
  onChange,
  format = 'compact',
  isFixed = false,
}: {
  mode: BreakdownCountMode;
  onChange: (mode: BreakdownCountMode) => void;
  format?: 'compact' | 'sentence';
  isFixed?: boolean;
}) {
  const isSentence = format === 'sentence';
  const label = mode === 'estimate' ? 'estimated' : 'exact';
  if (isFixed) {
    return (
      <ChartControlValue
        prefix={isSentence ? 'Showing' : undefined}
        suffix={isSentence ? 'breakdowns' : undefined}
      >
        {label}
      </ChartControlValue>
    );
  }
  return (
    <Dropdown>
      <DropdownTrigger>
        <ChartControlTrigger
          prefix={isSentence ? 'Showing' : undefined}
          suffix={isSentence ? 'breakdowns' : undefined}
        >
          {label}
        </ChartControlTrigger>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownMenu
          selectable
          selectedItems={[mode]}
          onSelect={(key) => key && onChange(key as BreakdownCountMode)}
          aria-label="Breakdown count mode"
        >
          <DropdownItem value="estimate">Estimated</DropdownItem>
          <DropdownItem value="exact">Exact</DropdownItem>
        </DropdownMenu>
      </DropdownPopover>
    </Dropdown>
  );
}
