import { PropsWithChildren } from 'react';
import { TooltipTrigger } from 'react-aria-components';

interface TooltipProps {
  disabled?: boolean;
  delay?: number;
  closeDelay?: number;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function Tooltip({
  children,
  disabled,
  delay = 0,
  closeDelay,
  isOpen,
  onOpenChange,
}: PropsWithChildren<TooltipProps>) {
  return (
    <TooltipTrigger
      delay={delay}
      closeDelay={closeDelay}
      isDisabled={disabled}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      {children}
    </TooltipTrigger>
  );
}
