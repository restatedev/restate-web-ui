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
      className="-mt-2 [&_a]:px-5 [&_a]:py-1 [&_a]:text-xs [&_a[aria-current]]:font-semibold [&>div]:border-[0.5px] [&>div]:border-zinc-800/5 [&>div]:bg-black/3 [&>div]:shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]"
    >
      <Nav ariaCurrentValue="time" responsive={false}>
        <NavSearchItem search={`${OVERVIEW_RANGE_PARAM}=${PeriodRange.PT1H}`}>
          1h
        </NavSearchItem>
        <NavSearchItem search={`${OVERVIEW_RANGE_PARAM}=${PeriodRange.P1D}`}>
          24h
        </NavSearchItem>
        <NavSearchItem search="">All</NavSearchItem>
      </Nav>
    </div>
  );
}
