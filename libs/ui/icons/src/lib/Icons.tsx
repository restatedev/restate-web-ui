import { Check, ChevronDown, LucideIcon } from 'lucide-react';
import { tv } from 'tailwind-variants';

const enum IconName {
  ChevronDown = 'ChevronDown',
  Check = 'Check',
}
export interface IconsProps {
  filled?: boolean;
  name: IconName;
}

const ICONS: Record<IconName, LucideIcon> = {
  [IconName.ChevronDown]: ChevronDown,
  [IconName.Check]: Check,
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

export function Icon({ name, filled }: IconsProps) {
  const IconComponent = ICONS[name];
  return (
    <IconComponent
      className={icon({ variant: filled ? 'filled' : 'stroked' })}
    />
  );
}
