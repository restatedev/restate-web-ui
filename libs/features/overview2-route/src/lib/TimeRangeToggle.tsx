import { MouseEvent, type ReactNode } from 'react';
import { Nav, NavSearchItem } from '@restate/ui/nav';
import { OVERVIEW_RANGE_PARAM, PeriodRange } from './useRangeFilters';

function ActiveCount({ children }: { children: ReactNode }) {
  return (
    <span data-count className="ml-1 hidden font-normal text-blue-500">
      {' ﹣ '}
      {children}
    </span>
  );
}

export function TimeRangeToggle({
  onChange,
  countLabel,
}: {
  onChange?: () => void;
  countLabel?: ReactNode;
}) {
  const handleClick = (e: MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest('a');
    if (anchor && !anchor.hasAttribute('aria-current')) {
      onChange?.();
    }
  };

  return (
    <div
      onClick={handleClick}
      className="-mt-2 transition-all [&_[data-active=true]]:font-medium [&_[data-active=true]_[data-count]]:inline [&_[role=row]]:py-0.5 [&_a]:px-5 [&_a]:py-1 [&_a]:text-xs [&>div]:border-[0.5px] [&>div]:border-zinc-800/5 [&>div]:bg-black/3 [&>div]:shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]"
    >
      <Nav
        ariaCurrentValue="time"
        responsive={false}
        className="transition-all"
      >
        <NavSearchItem param={OVERVIEW_RANGE_PARAM}>
          1h
          {countLabel && <ActiveCount>{countLabel}</ActiveCount>}
        </NavSearchItem>
        <NavSearchItem param={OVERVIEW_RANGE_PARAM} value={PeriodRange.P1D}>
          24h
          {countLabel && <ActiveCount>{countLabel}</ActiveCount>}
        </NavSearchItem>
        <NavSearchItem param={OVERVIEW_RANGE_PARAM} value={PeriodRange.ALL}>
          All
          {countLabel && <ActiveCount>{countLabel}</ActiveCount>}
        </NavSearchItem>
      </Nav>
    </div>
  );
}
