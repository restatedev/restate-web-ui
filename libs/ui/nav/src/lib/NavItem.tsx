import { useLocation, useNavigation } from 'react-router';
import { focusRing } from '@restate/ui/focus';
import { Link } from '@restate/ui/link';
import { PropsWithChildren, useContext, useMemo } from 'react';
import { tv } from 'tailwind-variants';
import { NavContext } from './NavContext';
import { Button } from '@restate/ui/button';

interface NavItemProps {
  href: string;
  preserveSearchParams?: boolean | string[];
}

const styles = tv({
  extend: focusRing,
  base: 'group no-underline isolate flex py-1.5 px-3 text-sm text-center transition rounded-xl cursor-default hover:bg-black/[0.03] pressed:bg-gray-200',
  variants: {
    isCurrent: {
      true: 'text-gray-800',
      false: ' text-gray-500',
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
  const isActive = location.pathname === href;
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
export function NavSearchItem({
  children,
  search,
}: PropsWithChildren<NavSearchItemProps>) {
  const currentLocation = useLocation();
  const { location: nextLocation, state } = useNavigation();
  const location = state === 'loading' ? nextLocation : currentLocation;
  const currentSearchParams = new URLSearchParams(location.search);
  currentSearchParams.sort();
  const targetSearchParams = new URLSearchParams(search);
  const keys = Array.from(targetSearchParams.keys());
  const mergedTargetSearchParams = keys.reduce((search, key) => {
    const value = targetSearchParams.get(key);
    if (value) {
      search.set(key, value);
    } else {
      search.delete(key);
    }
    return search;
  }, new URLSearchParams(currentSearchParams));
  mergedTargetSearchParams.sort();

  const isActive =
    currentSearchParams.toString() === mergedTargetSearchParams.toString();
  const targetSearch =
    targetSearchParams.size > 0 ? `?${targetSearchParams.toString()}` : '';

  const { value } = useContext(NavContext);

  return (
    <li>
      <Link
        className={styles()}
        href={`${location.pathname}${targetSearch}${location.hash}`}
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
  base: 'group no-underline font-sans bg-transparent border-none shadow-none isolate flex py-1.5 px-3 text-xs text-center transition rounded-xl cursor-default hover:bg-black/[0.03] pressed:bg-black/[0.06]',
  variants: {
    isActive: {
      true: 'text-gray-800',
      false: ' text-gray-600',
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
