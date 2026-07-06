import { PropsWithChildren, useMemo } from 'react';
import {
  BreadcrumbsProvider as BaseBreadcrumbsProvider,
  type PageDefinition,
} from '@restate/ui/breadcrumbs';
import { BREADCRUMB_PAGES, createBreadcrumbPages } from './pages';

export function BreadcrumbsProvider({
  pages,
  patternPrefix,
  children,
}: PropsWithChildren<{
  pages?: PageDefinition[];
  patternPrefix?: string;
}>) {
  const resolvedPages = useMemo(
    () =>
      pages ??
      (patternPrefix
        ? createBreadcrumbPages({ patternPrefix })
        : BREADCRUMB_PAGES),
    [pages, patternPrefix],
  );
  return (
    <BaseBreadcrumbsProvider pages={resolvedPages}>
      {children}
    </BaseBreadcrumbsProvider>
  );
}
