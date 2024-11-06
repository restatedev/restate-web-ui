import { PropsWithChildren } from 'react';
import { TooltipTrigger } from 'react-aria-components';

interface TooltipProps {
  disabled?: boolean;
  delay?: number;
  closeDelay?: number;
}

export function Tooltip({
  children,
  disabled,
  delay = 0,
  closeDelay,
}: PropsWithChildren<TooltipProps>) {
  return (
    <TooltipTrigger delay={delay} closeDelay={closeDelay} isDisabled={disabled}>
      {children}
    </TooltipTrigger>
  );
}
