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
  ExternalLink,
  Wallet,
  X,
  Box,
  SquareFunction,
  Info,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { tv } from 'tailwind-variants';
import { RestateEnvironment } from './custom-icons/RestateEnvironment';
import { Restate } from './custom-icons/Restate';
import { CircleX } from './custom-icons/CircleX';
import { Lambda } from './custom-icons/Lambda';
import { Docs } from './custom-icons/Docs';
import { Github } from './custom-icons/Github';
import { Discord } from './custom-icons/Discord';
import { SupportTicket } from './custom-icons/SupportTicket';
import { Help } from './custom-icons/Help';

export const enum IconName {
  ChevronDown = 'ChevronDown',
  ChevronRight = 'ChevronRight',
  Check = 'Check',
  RestateEnvironment = 'RestateEnvironment',
  Restate = 'Restate',
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
  ExternalLink = 'ExternalLink',
  Wallet = 'Wallet',
  X = 'X',
  Docs = 'Docs',
  Discord = 'Discord',
  Github = 'Github',
  SupportTicket = 'SupportTicket',
  Help = 'Help',
  Lambda = 'Lambda',
  Box = 'Box',
  Function = 'SquareFunction',
  Info = 'Info',
  ArrowRight = 'ArrowRight',
  ArrowLeft = 'ArrowLeft',
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
  [IconName.ExternalLink]: ExternalLink,
  [IconName.Wallet]: Wallet,
  [IconName.X]: X,
  [IconName.Restate]: Restate,
  [IconName.Docs]: Docs,
  [IconName.Github]: Github,
  [IconName.Discord]: Discord,
  [IconName.SupportTicket]: SupportTicket,
  [IconName.Help]: Help,
  [IconName.Lambda]: Lambda,
  [IconName.Box]: Box,
  [IconName.Function]: SquareFunction,
  [IconName.Info]: Info,
  [IconName.ArrowLeft]: ArrowLeft,
  [IconName.ArrowRight]: ArrowRight,
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
