import { MouseEvent } from 'react';
import { Nav, NavSearchItem } from '@restate/ui/nav';
import { OVERVIEW_RANGE_PARAM, PeriodRange } from './useRangeFilters';

export function TimeRangeToggle({ onChange }: { onChange?: () => void }) {
  const handleClick = (e: MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest('a');
    if (anchor && !anchor.hasAttribute('aria-current')) {
      onChange?.();
    }
  };

  return (
    <div
      onClick={handleClick}
      className="[&_[role=row]]:py-0.5 [&_a]:px-5 [&_a]:py-1 [&_a]:text-xs [&_a[aria-current]]:font-semibold [&>div]:border-[0.5px] [&>div]:border-zinc-800/5 [&>div]:bg-black/3 [&>div]:shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]"
    >
      <Nav ariaCurrentValue="time" responsive={false}>
        <NavSearchItem param={OVERVIEW_RANGE_PARAM}>1h</NavSearchItem>
        <NavSearchItem param={OVERVIEW_RANGE_PARAM} value={PeriodRange.P1D}>
          24h
        </NavSearchItem>
        <NavSearchItem param={OVERVIEW_RANGE_PARAM} value={PeriodRange.ALL}>
          All
        </NavSearchItem>
      </Nav>
    </div>
  );
}
