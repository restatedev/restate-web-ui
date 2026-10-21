import type { IconName } from '@restate/ui-icons';

export type PalettePage = 'root' | 'playground' | 'queries';

export type CommandSectionId =
  | 'matches'
  | 'actions'
  | 'services'
  | 'handlers'
  | 'deployments'
  | 'pages'
  | 'invocations'
  | 'flowControl'
  | 'recentQueries'
  | 'usefulQueries';

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
  page?: PalettePage;
  monospace?: boolean;
  destructive?: boolean;
}

export interface CommandSection {
  id: CommandSectionId;
  title: string;
  items: Command[];
}
