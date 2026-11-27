import { generatePath, matchPath, type Params } from 'react-router';
import { stripTransientSearch } from '@restate/util-panel';
import type { Crumb, PageDefinition } from './types';

export interface ClassifiedPage {
  page: PageDefinition;
  params: Params;
}

export function classify(
  pages: PageDefinition[],
  pathname: string,
): ClassifiedPage | undefined {
  for (const page of pages) {
    const match = matchPath(page.pattern, pathname);
    if (match) {
      return { page, params: match.params };
    }
  }
  return undefined;
}

function createCrumb(
  { page, params }: ClassifiedPage,
  pathname: string,
  search: string,
): Crumb {
  return {
    kind: page.kind,
    resource: page.resource,
    pattern: page.pattern,
    pathname,
    // Crumb hrefs are restored later, so one-shot params (open confirmation
    // dialogs) must not be part of them.
    href: `${pathname}${stripTransientSearch(search)}`,
    label:
      typeof page.label === 'function'
        ? page.label(params, search)
        : page.label,
    icon: page.icon,
    params,
  };
}

function createListCrumb(
  list: PageDefinition,
  detailParams: Params,
  getListSearch?: (pathname: string) => string | undefined,
): Crumb | undefined {
  try {
    const pathname = generatePath(list.pattern, detailParams);
    const params = matchPath(list.pattern, pathname)?.params ?? {};
    return createCrumb(
      { page: list, params },
      pathname,
      getListSearch?.(pathname) ?? '',
    );
  } catch {
    return undefined;
  }
}

export function computeTrail({
  pages,
  pathname,
  search = '',
  getListSearch,
}: {
  pages: PageDefinition[];
  pathname: string;
  search?: string;
  getListSearch?: (pathname: string) => string | undefined;
}): Crumb[] {
  const matched = classify(pages, pathname);
  if (!matched) {
    return [];
  }
  const current = createCrumb(matched, pathname, search);
  if (matched.page.kind === 'list') {
    return [current];
  }
  const list = pages.find(
    (page) => page.kind === 'list' && page.resource === matched.page.resource,
  );
  const listCrumb =
    list && createListCrumb(list, matched.params, getListSearch);
  return listCrumb ? [listCrumb, current] : [current];
}
