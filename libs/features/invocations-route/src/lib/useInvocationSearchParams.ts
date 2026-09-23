import { useCallback, useMemo } from 'react';
import {
  useHref,
  useLocation,
  useNavigation,
  useSearchParams,
  type SetURLSearchParams,
} from 'react-router';

export function useInvocationSearchParams(): [
  URLSearchParams,
  SetURLSearchParams,
] {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const pathname = useHref(location.pathname);
  const navigation = useNavigation();
  const pendingSearch =
    navigation.state === 'loading' && navigation.location.pathname === pathname
      ? navigation.location.search
      : undefined;
  const requestedSearchParams = useMemo(
    () =>
      pendingSearch === undefined
        ? searchParams
        : new URLSearchParams(pendingSearch),
    [pendingSearch, searchParams],
  );

  const setRequestedSearchParams = useCallback<SetURLSearchParams>(
    (next, options) =>
      setSearchParams(
        typeof next === 'function'
          ? next(new URLSearchParams(requestedSearchParams))
          : next,
        { flushSync: true, preventScrollReset: true, ...options },
      ),
    [requestedSearchParams, setSearchParams],
  );
  return [requestedSearchParams, setRequestedSearchParams];
}
