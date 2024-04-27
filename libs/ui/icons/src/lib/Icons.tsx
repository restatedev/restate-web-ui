import { Check, ChevronDown, ChevronRight, ChevronsUpDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { tv } from 'tailwind-variants';
import { RestateEnvironment } from './custom-icons/RestateEnvironment';

export const enum IconName {
  ChevronDown = 'ChevronDown',
  ChevronRight = 'ChevronRight',
  Check = 'Check',
  RestateEnvironment = 'RestateEnvironment',
  ChevronsUpDown = 'ChevronsUpDown',
}
export interface IconsProps {
  filled?: boolean;
  name: IconName;
  ['aria-hidden']?: boolean;
  className?: string;
}

const ICONS: Record<IconName, LucideIcon> = {
  [IconName.ChevronDown]: ChevronDown,
  [IconName.Check]: Check,
  [IconName.ChevronRight]: ChevronRight,
  [IconName.ChevronsUpDown]: ChevronsUpDown,
  [IconName.RestateEnvironment]: RestateEnvironment,
};

const styles = tv({
  base: 'w-[1.5em] h-[1.5em]',
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

export function Icon({ name, filled, className, ...props }: IconsProps) {
  const IconComponent = ICONS[name];
  return (
    <IconComponent
      {...props}
      className={styles({ variant: filled ? 'filled' : 'stroked', className })}
    />
  );
}
