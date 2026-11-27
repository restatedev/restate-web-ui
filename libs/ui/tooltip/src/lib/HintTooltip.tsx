import type { PropsWithChildren, ReactNode } from 'react';
import { HoverTooltip } from './HoverTooltip';

const HINT_OPEN_DELAY = 1000;
const HINT_CLOSE_DELAY = 100;

export function HintTooltip({
  hint,
  placement,
  offset = 8,
  className,
  disabled,
  children,
}: PropsWithChildren<{
  hint?: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  offset?: number;
  className?: string;
  disabled?: boolean;
}>) {
  if (!hint) {
    return children;
  }
  return (
    <HoverTooltip
      content={hint}
      placement={placement}
      offset={offset}
      delay={HINT_OPEN_DELAY}
      closeDelay={HINT_CLOSE_DELAY}
      disabled={disabled}
      className={className}
      contentClassName="break-normal"
      hideAfterPress
    >
      {children}
    </HoverTooltip>
  );
}
