import type { ComponentType, ReactNode } from 'react';
import type { IconName } from '@restate/ui-icons';

export interface Command {
  id: string;
  label: string;
  description?: string;
  hint?: string;
  icon: IconName;
  rotateIcon?: boolean;
  keywords?: string[];
  href?: string;
  target?: '_blank';
  onAction?: VoidFunction;
  runImmediately?: boolean;
  step?: string;
  monospace?: boolean;
  destructive?: boolean;
  searchOnly?: boolean;
}

export interface CommandSection {
  id: string;
  title: string;
  items: Command[];
  searchOnly?: boolean;
  hiddenCount?: number;
}

export interface CommandPaletteStep {
  id: string;
  label: string;
  placeholder: string;
  sections: CommandSection[];
}

export interface CommandPaletteExtension {
  actions?: Command[];
  sections?: CommandSection[];
  steps?: CommandPaletteStep[];
}

export type CommandPaletteExtensionComponent = ComponentType<{
  children: (extension: CommandPaletteExtension) => ReactNode;
}>;
