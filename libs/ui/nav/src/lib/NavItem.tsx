import { useLocation, useNavigation } from 'react-router';
import { focusRing } from '@restate/ui/focus';
import { Link } from '@restate/ui/link';
import { PropsWithChildren, useCallback, useContext, useMemo } from 'react';
import { tv } from '@restate/util/styles';
import { NavContext } from './NavContext';
import { Button } from '@restate/ui/button';

interface NavItemProps {
  href: string;
  preserveSearchParams?: boolean | string[];
}

const styles = tv({
  extend: focusRing,
  base: 'group isolate flex cursor-default rounded-xl px-3 py-1.5 text-center text-sm no-underline transition hover:bg-black/3 pressed:bg-gray-200',
  variants: {
    isCurrent: {
      true: 'text-gray-800',
      false: 'text-gray-500',
    },
  },
  defaultVariants: {
    isCurrent: false,
  },
});

export function NavItem({
  children,
  href,
  preserveSearchParams = false,
}: PropsWithChildren<NavItemProps>) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(href);
  const { value } = useContext(NavContext);

  const search = useMemo(() => {
    if (Array.isArray(preserveSearchParams)) {
      const searchParams = new URLSearchParams(location.search);
      Array.from(searchParams.keys()).forEach((key) => {
        if (!preserveSearchParams.includes(key)) {
          searchParams.delete(key);
        }
      });
      return '?' + searchParams.toString();
    } else {
      return location.search;
    }
  }, [location.search, preserveSearchParams]);

  return (
    <li>
      <Link
        className={styles()}
        href={preserveSearchParams ? `${href}${search}${location.hash}` : href}
        data-active={isActive}
        {...(isActive && { 'aria-current': value })}
      >
        {children}
      </Link>
    </li>
  );
}

interface NavSearchItemProps {
  search: string;
}

export function useGetHrefFromSearch() {
  const currentLocation = useLocation();
  const { location: nextLocation, state } = useNavigation();
  const location = state === 'loading' ? nextLocation : currentLocation;

  const getHref = useCallback(
    (search: string) => {
      const currentSearchParams = new URLSearchParams(location.search);
      currentSearchParams.sort();
      const targetSearchParams = new URLSearchParams(search);
      const keys = Array.from(targetSearchParams.keys());
      const excludingNewParams = keys.reduce((search, key) => {
        search.delete(key);
        return search;
      }, new URLSearchParams(location.search));
      const withNewParams = new URLSearchParams([
        ...excludingNewParams,
        ...new URLSearchParams(search),
      ]);
      const withNewParamsSorted = new URLSearchParams(withNewParams);
      withNewParamsSorted.sort();

      const targetSearch =
        targetSearchParams.size > 0 ? `?${withNewParams.toString()}` : '';
      return {
        href: `${location.pathname}${targetSearch}${location.hash}`,
        isActive:
          currentSearchParams.toString() === withNewParamsSorted.toString(),
      };
    },
    [location.hash, location.pathname, location.search],
  );

  return getHref;
}

export function NavSearchItem({
  children,
  search,
}: PropsWithChildren<NavSearchItemProps>) {
  const getHref = useGetHrefFromSearch();
  const { href, isActive } = getHref(search);
  const { value } = useContext(NavContext);

  return (
    <li>
      <Link
        className={styles()}
        href={href}
        data-active={isActive}
        {...(isActive && { 'aria-current': value })}
      >
        {children}
      </Link>
    </li>
  );
}

interface NavButtonItemProps {
  isActive: boolean;
  onClick?: VoidFunction;
}
const buttonStyles = tv({
  base: 'group isolate flex cursor-default rounded-xl border-none bg-transparent px-3 py-1.5 text-center font-sans text-xs no-underline shadow-none transition hover:bg-black/3 pressed:bg-black/[0.06]',
  variants: {
    isActive: {
      true: 'text-gray-800',
      false: 'text-gray-600',
    },
  },
  defaultVariants: {
    isActive: false,
  },
});
export function NavButtonItem({
  children,
  isActive,
  onClick,
}: PropsWithChildren<NavButtonItemProps>) {
  return (
    <li>
      <Button
        variant="secondary"
        className={buttonStyles({ isActive })}
        onClick={onClick}
        data-active={isActive}
        {...(isActive && { 'aria-pressed': true })}
      >
        {children}
      </Button>
    </li>
  );
}
