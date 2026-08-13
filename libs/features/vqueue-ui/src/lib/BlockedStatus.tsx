import { Badge } from '@restate/ui/badge';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { tv } from '@restate/util/styles';
import type { ReactNode } from 'react';

const styles = tv({
  slots: {
    status:
      'relative inline-flex max-w-full min-w-0 shrink items-center gap-1.5 border-dashed py-0.5 pr-0.5',
    reason:
      'flex h-5 min-w-0 items-center gap-1 rounded-md border-gray-200/80 bg-white/70 px-1.5 py-0.5 text-2xs text-orange-700 shadow-none',
    alert: 'h-3 w-3 shrink-0 text-orange-600',
    label: 'truncate',
    chevrons: 'h-3 w-3 shrink-0 text-gray-500',
    popover: 'w-fit max-w-[min(28rem,calc(100vw-2rem))] min-w-56',
    details: 'px-4 py-3 text-xs text-zinc-600',
  },
});

export interface BlockedStatusProps {
  reason: string;
  details?: ReactNode;
}

export function BlockedStatus({ reason, details }: BlockedStatusProps) {
  const {
    status,
    reason: reasonStyle,
    alert,
    label,
    chevrons,
    popover,
    details: detailsStyle,
  } = styles();

  return (
    <Badge variant="warning" className={status()}>
      <span>Blocked</span>
      <Popover>
        <PopoverTrigger>
          <Button variant="secondary" className={reasonStyle()}>
            <Icon name={IconName.TriangleAlert} className={alert()} />
            <span className={label()}>on {reason}</span>
            <Icon name={IconName.ChevronsUpDown} className={chevrons()} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className={popover()}>
          <DropdownSection title="Blocked on">
            <div className={detailsStyle()}>{details ?? reason}</div>
          </DropdownSection>
        </PopoverContent>
      </Popover>
    </Badge>
  );
}
