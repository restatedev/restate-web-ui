import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocation } from 'react-router';
import { getListSearch, storeListSearch } from './store';
import { computeTrail } from './trail';
import type { Crumb, PageDefinition, TrailCrumb } from './types';

const BreadcrumbsContext = createContext<{
  trail: Crumb[];
  pages: PageDefinition[];
}>({ trail: [], pages: [] });

export function BreadcrumbsProvider({
  pages,
  children,
}: PropsWithChildren<{ pages: PageDefinition[] }>) {
  const location = useLocation();
  const [trail, setTrail] = useState<Crumb[]>([]);

  useEffect(() => {
    const next = computeTrail({
      pages,
      pathname: location.pathname,
      search: location.search,
      getListSearch,
    });
    const current = next.at(-1);
    if (current?.kind === 'list') {
      storeListSearch(current.pathname, location.search);
    }
    setTrail(next);
  }, [location.pathname, location.search, pages]);

  const value = useMemo(() => ({ trail, pages }), [trail, pages]);

  return (
    <BreadcrumbsContext.Provider value={value}>
      {children}
    </BreadcrumbsContext.Provider>
  );
}

export function useBreadcrumbs(): TrailCrumb[] {
  const { trail } = useContext(BreadcrumbsContext);
  return useMemo(
    () =>
      trail.map((crumb, index) => ({
        ...crumb,
        isCurrent: index === trail.length - 1,
      })),
    [trail],
  );
}

export function useBreadcrumbPages(): PageDefinition[] {
  return useContext(BreadcrumbsContext).pages;
}
