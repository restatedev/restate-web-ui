import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Plus,
  LogOut,
  Squircle,
  Trash,
  Circle,
  CircleDashed,
  CircleDotDashed,
  TriangleAlert,
  Minus,
  Copy,
  RotateCw,
  SquareCheckBig,
  Terminal,
  Lock,
  FileKey,
  Globe,
  FileClock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { tv } from 'tailwind-variants';
import { RestateEnvironment } from './custom-icons/RestateEnvironment';
import { CircleX } from './custom-icons/CircleX';

export const enum IconName {
  ChevronDown = 'ChevronDown',
  ChevronRight = 'ChevronRight',
  Check = 'Check',
  RestateEnvironment = 'RestateEnvironment',
  ChevronsUpDown = 'ChevronsUpDown',
  Plus = 'Plus',
  LogOut = 'LogOut',
  Squircle = 'Squircle',
  Trash = 'Trash',
  Circle = 'Circle',
  CircleDashed = 'CircleDashed',
  TriangleAlert = 'TriangleAlert',
  CircleDotDashed = 'CircleDotDashed',
  CircleX = 'CircleX',
  Minus = 'Minus',
  Copy = 'Copy',
  Retry = 'Retry',
  SquareCheckBig = 'SquareCheckBig',
  Http = 'Http',
  Security = 'Security',
  ApiKey = 'ApiKey',
  Cli = 'Cli',
  Log = 'Log',
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
  [IconName.Squircle]: Squircle,
  [IconName.Trash]: Trash,
  [IconName.Circle]: Circle,
  [IconName.CircleDashed]: CircleDashed,
  [IconName.TriangleAlert]: TriangleAlert,
  [IconName.CircleDotDashed]: CircleDotDashed,
  [IconName.CircleX]: CircleX,
  [IconName.Minus]: Minus,
  [IconName.Copy]: Copy,
  [IconName.SquareCheckBig]: SquareCheckBig,
  [IconName.Retry]: RotateCw,
  [IconName.Security]: Lock,
  [IconName.Cli]: Terminal,
  [IconName.ApiKey]: FileKey,
  [IconName.Http]: Globe,
  [IconName.Log]: FileClock,
};

const styles = tv({
  base: 'w-[1.5em] h-[1.5em] text-current',
});

export function Icon({ name, className, ...props }: IconsProps) {
  const IconComponent = ICONS[name];
  return (
    <IconComponent
      {...props}
      className={styles({ className })}
      aria-hidden="true"
    />
  );
}
