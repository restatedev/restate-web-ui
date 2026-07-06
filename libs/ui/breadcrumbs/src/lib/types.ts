import type { IconName } from '@restate/ui/icons';
import type { ComponentType } from 'react';
import type { Params } from 'react-router';

export type PageKind = 'list' | 'detail';

export interface BreadcrumbComponentProps {
  crumb: TrailCrumb;
}

export interface PageDefinition {
  pattern: string;
  kind: PageKind;
  resource: string;
  label: string | ((params: Params) => string);
  icon: IconName;
  Content?: ComponentType<BreadcrumbComponentProps>;
  Popover?: ComponentType<BreadcrumbComponentProps>;
}

export interface Crumb {
  kind: PageKind;
  resource: string;
  pattern: string;
  pathname: string;
  href: string;
  label: string;
  icon: IconName;
  params: Params;
}

export interface TrailCrumb extends Crumb {
  isCurrent: boolean;
}
