import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { tv } from 'tailwind-variants';

export const enum IconName {
  ChevronDown = 'ChevronDown',
  ChevronRight = 'ChevronRight',
  Check = 'Check',
}
export interface IconsProps {
  filled?: boolean;
  name: IconName;
  ['aria-hidden']?: boolean;
}

const ICONS: Record<IconName, LucideIcon> = {
  [IconName.ChevronDown]: ChevronDown,
  [IconName.Check]: Check,
  [IconName.ChevronRight]: ChevronRight,
};

const icon = tv({
  base: 'width-[1em] height-[1em]',
  variants: {
    variant: {
      filled: '',
      stroked: '',
    },
  },
  defaultVariants: {
    variant: 'stroked',
  },
});

export function Icon({ name, filled, ...props }: IconsProps) {
  const IconComponent = ICONS[name];
  return (
    <IconComponent
      {...props}
      className={icon({ variant: filled ? 'filled' : 'stroked' })}
    />
  );
}
