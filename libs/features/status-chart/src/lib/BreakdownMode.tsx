import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import type { BreakdownCountMode } from '@restate/features/user-preference';
import { ChartControlTrigger } from './ChartControlTrigger';

export function BreakdownMode({
  mode,
  onChange,
  format = 'compact',
}: {
  mode: BreakdownCountMode;
  onChange: (mode: BreakdownCountMode) => void;
  format?: 'compact' | 'sentence';
}) {
  const isSentence = format === 'sentence';
  return (
    <Dropdown>
      <DropdownTrigger>
        <ChartControlTrigger
          prefix={isSentence ? 'Showing' : undefined}
          suffix={isSentence ? 'breakdowns' : undefined}
        >
          {mode === 'estimate' ? 'estimated' : 'exact'}
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
