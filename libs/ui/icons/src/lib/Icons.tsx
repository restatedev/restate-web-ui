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
  Eye,
  Wallet,
  X,
  Box,
  ChevronUp,
  Info,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  Settings,
  TableProperties,
  ChevronsLeftRightEllipsis,
  Timer,
  Ellipsis,
  Maximize2,
  Minimize2,
  ChevronLast,
  ChevronFirst,
  Pencil,
  Database,
  ScanSearch,
  Download,
  CornerDownLeft,
  Radio,
  ClockAlert,
  Play,
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
import { Slack } from './custom-icons/Slack';
import { SupportTicket } from './custom-icons/SupportTicket';
import { Help } from './custom-icons/Help';
import { Question } from './custom-icons/Question';
import { Function } from './custom-icons/Function';
import { Go } from './custom-icons/Go';
import { Java } from './custom-icons/Java';
import { Kotlin } from './custom-icons/Kotlin';
import { Typescript } from './custom-icons/Typescript';
import { Rust } from './custom-icons/Rust';
import { Python } from './custom-icons/Python';

export const enum IconName {
  Settings = 'Settings',
  Invocation = 'Invocation',
  TableProperties = 'TableProperties',
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
  ChevronLeft = 'ChevronLeft',
  ChevronUp = 'ChevronUp',
  Question = 'Question',
  Timer = 'Timer',
  Go = 'Go',
  Rust = 'Rust',
  Typescript = 'Typescript',
  Java = 'Java',
  Python = 'Python',
  Kotlin = 'Kotlin',
  Ellipsis = 'Ellipsis',
  Slack = 'Slack',
  Maximize = 'Maximize',
  Minimize = 'Minimize',
  ChevronLast = 'ChevronLast',
  ChevronFirst = 'ChevronFirst',
  Pencil = 'Pencil',
  Database = 'Database',
  ScanSearch = 'ScanSearch',
  Download = 'Download',
  Return = 'Return',
  Radio = 'Radio',
  Eye = 'Eye',
  ClockAlert = 'ClockAlert',
  Play = 'Play',
}
export interface IconsProps {
  name: IconName;
  ['aria-hidden']?: boolean;
  className?: string;
}

const ICONS: Record<IconName, LucideIcon> = {
  [IconName.Settings]: Settings,
  [IconName.TableProperties]: TableProperties,
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
  [IconName.Function]: Function,
  [IconName.Info]: Info,
  [IconName.ArrowLeft]: ArrowLeft,
  [IconName.ArrowRight]: ArrowRight,
  [IconName.ChevronLeft]: ChevronLeft,
  [IconName.ChevronUp]: ChevronUp,
  [IconName.Question]: Question,
  [IconName.Invocation]: ChevronsLeftRightEllipsis,
  [IconName.Timer]: Timer,
  [IconName.Go]: Go,
  [IconName.Rust]: Rust,
  [IconName.Typescript]: Typescript,
  [IconName.Java]: Java,
  [IconName.Python]: Python,
  [IconName.Ellipsis]: Ellipsis,
  [IconName.Kotlin]: Kotlin,
  [IconName.Slack]: Slack,
  [IconName.Maximize]: Maximize2,
  [IconName.Minimize]: Minimize2,
  [IconName.ChevronFirst]: ChevronFirst,
  [IconName.ChevronLast]: ChevronLast,
  [IconName.Pencil]: Pencil,
  [IconName.Database]: Database,
  [IconName.ScanSearch]: ScanSearch,
  [IconName.Download]: Download,
  [IconName.Return]: CornerDownLeft,
  [IconName.Radio]: Radio,
  [IconName.ClockAlert]: ClockAlert,
  [IconName.Eye]: Eye,
  [IconName.Play]: Play,
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
