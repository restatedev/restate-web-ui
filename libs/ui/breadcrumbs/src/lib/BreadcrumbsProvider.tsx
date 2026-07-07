import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router';
import { getStoredTrail, storeTrail } from './store';
import { computeNextTrail, sanitizeCrumb } from './trail';
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
  const prevTrailRef = useRef<Crumb[]>([]);

  useEffect(() => {
    const stored = getStoredTrail(location.key);
    const isRestorable =
      stored && stored.at(-1)?.pathname === location.pathname;
    const next = isRestorable
      ? stored.map(sanitizeCrumb)
      : computeNextTrail({
          pages,
          prevTrail: prevTrailRef.current,
          pathname: location.pathname,
          search: location.search,
        });
    if (!isRestorable) {
      storeTrail(location.key, next);
    }
    prevTrailRef.current = next;
    setTrail(next);
  }, [location.key, location.pathname, location.search, pages]);

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
