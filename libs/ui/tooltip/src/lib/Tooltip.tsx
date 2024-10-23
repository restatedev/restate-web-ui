import { PropsWithChildren } from 'react';
import { TooltipTrigger } from 'react-aria-components';

type TooltipProps = unknown;

export function Tooltip({ children }: PropsWithChildren<TooltipProps>) {
  return <TooltipTrigger delay={0}>{children}</TooltipTrigger>;
}
