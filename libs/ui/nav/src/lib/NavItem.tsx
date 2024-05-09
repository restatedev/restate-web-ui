import { useLocation } from '@remix-run/react';
import { focusRing } from '@restate/ui/focus';
import { Link } from '@restate/ui/link';
import { PropsWithChildren, useContext } from 'react';
import { tv } from 'tailwind-variants';
import { NavContext } from './NavContext';

interface NavItemProps {
  href: string;
}

const styles = tv({
  extend: focusRing,
  base: 'no-underline isolate flex py-1.5 px-3 text-sm text-center transition rounded-xl cursor-default hover:bg-black/[0.03] pressed:bg-gray-200',
  variants: {
    isCurrent: {
      true: 'text-gray-800',
      false: ' text-gray-600',
    },
  },
  defaultVariants: {
    isCurrent: false,
  },
});

export function NavItem({ children, href }: PropsWithChildren<NavItemProps>) {
  const location = useLocation();
  const isActive = location.pathname === href;
  const { value } = useContext(NavContext);

  return (
    <li>
      <Link
        className={styles}
        href={href}
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
  const location = useLocation();
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
        className={styles}
        href={`${location.pathname}${targetSearch}${location.hash}`}
        data-active={isActive}
        {...(isActive && { 'aria-current': value })}
      >
        {children}
      </Link>
    </li>
  );
}
