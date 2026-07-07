import { generatePath, matchPath, type Params } from 'react-router';
import { stripTransientSearch } from '@restate/util/panel';
import type { Crumb, PageDefinition } from './types';

export const MAX_TRAIL_LENGTH = 20;

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

function synthesizeListCrumb(
  list: PageDefinition,
  detailParams: Params,
): Crumb | undefined {
  try {
    const pathname = generatePath(list.pattern, detailParams);
    const params = matchPath(list.pattern, pathname)?.params ?? {};
    return createCrumb({ page: list, params }, pathname, '');
  } catch {
    return undefined;
  }
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
    label: typeof page.label === 'function' ? page.label(params) : page.label,
    icon: page.icon,
    params,
  };
}

export function sanitizeCrumb(crumb: Crumb): Crumb {
  const queryIndex = crumb.href.indexOf('?');
  if (queryIndex === -1) {
    return crumb;
  }
  const search = stripTransientSearch(crumb.href.slice(queryIndex));
  const href = `${crumb.href.slice(0, queryIndex)}${search}`;
  return href === crumb.href ? crumb : { ...crumb, href };
}

export function computeNextTrail({
  pages,
  prevTrail = [],
  pathname,
  search = '',
}: {
  pages: PageDefinition[];
  prevTrail?: Crumb[];
  pathname: string;
  search?: string;
}): Crumb[] {
  const matched = classify(pages, pathname);
  if (!matched) {
    return [];
  }
  const current = createCrumb(matched, pathname, search);
  if (matched.page.kind === 'list') {
    return [current];
  }

  const cycleIndex = prevTrail.findIndex(
    (crumb) => crumb.pathname === pathname,
  );
  if (cycleIndex >= 0) {
    return [...prevTrail.slice(0, cycleIndex), current];
  }
  if (prevTrail.length === 0) {
    const list = pages.find(
      (page) => page.kind === 'list' && page.resource === matched.page.resource,
    );
    const listCrumb = list && synthesizeListCrumb(list, matched.params);
    return listCrumb ? [listCrumb, current] : [current];
  }
  return [...prevTrail, current].slice(-MAX_TRAIL_LENGTH);
}
