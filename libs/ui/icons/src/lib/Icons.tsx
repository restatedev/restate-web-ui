import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Plus,
  LogOut,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { tv } from 'tailwind-variants';
import { RestateEnvironment } from './custom-icons/RestateEnvironment';

export const enum IconName {
  ChevronDown = 'ChevronDown',
  ChevronRight = 'ChevronRight',
  Check = 'Check',
  RestateEnvironment = 'RestateEnvironment',
  ChevronsUpDown = 'ChevronsUpDown',
  Plus = 'Plus',
  LogOut = 'LogOut',
}
export interface IconsProps {
  name: IconName;
  ['aria-hidden']?: boolean;
  className?: string;
}

const ICONS: Record<IconName, LucideIcon> = {
  [IconName.ChevronDown]: ChevronDown,
  [IconName.Check]: Check,
  [IconName.ChevronRight]: ChevronRight,
  [IconName.ChevronsUpDown]: ChevronsUpDown,
  [IconName.Plus]: Plus,
  [IconName.LogOut]: LogOut,
  [IconName.RestateEnvironment]: RestateEnvironment,
};

const styles = tv({
  base: 'w-[1.5em] h-[1.5em] text-current',
});

export function Icon({ name, className, ...props }: IconsProps) {
  const IconComponent = ICONS[name];
  return <IconComponent {...props} className={styles({ className })} />;
}
