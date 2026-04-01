import { useLocation, useNavigation } from 'react-router';
import { GridListItem as AriaGridListItem } from 'react-aria-components';
import { Link, useHrefWithQueryParams } from '@restate/ui/link';
import { PropsWithChildren, useCallback, useContext } from 'react';
import { tv } from '@restate/util/styles';
import { NavContext } from './NavContext';
import { Button } from '@restate/ui/button';

interface NavItemProps {
  href: string;
  preserveSearchParams?: boolean | string[];
  disabled?: boolean;
}

const styles = tv({
  base: 'group isolate flex cursor-default rounded-xl px-3 py-1.5 text-center text-sm no-underline outline-offset-2 outline-blue-600 transition hover:bg-black/3 focus-visible:outline-2 pressed:bg-gray-200',
  variants: {
    isCurrent: {
      true: 'font-medium text-gray-700',
      false: 'text-gray-500',
    },
    isDisabled: {
      true: 'text-gray-400',
      false: '',
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
  disabled,
}: PropsWithChildren<NavItemProps>) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(href);
  const { value } = useContext(NavContext);
  const resolvedHref = useHrefWithQueryParams({
    preserveQueryParams: Boolean(preserveSearchParams),
    href,
  });
  return (
    <AriaGridListItem
      textValue={typeof children === 'string' ? children : undefined}
      href={resolvedHref}
      className={styles({ isCurrent: isActive, isDisabled: disabled })}
      data-active={isActive}
      {...(isActive && { 'aria-current': value })}
    >
      {children}
    </AriaGridListItem>
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
          targetSearchParams.size === 0
            ? currentSearchParams.toString() === ''
            : currentSearchParams.toString() ===
              withNewParamsSorted.toString(),
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
    <AriaGridListItem
      textValue={typeof children === 'string' ? children : undefined}
      href={href}
      className={styles()}
      data-active={isActive}
      {...(isActive && { 'aria-current': value })}
    >
      {children}
    </AriaGridListItem>
  );
}

interface NavButtonItemProps {
  isActive: boolean;
  onClick?: VoidFunction;
  className?: string;
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
  className,
}: PropsWithChildren<NavButtonItemProps>) {
  return (
    <AriaGridListItem
      textValue={typeof children === 'string' ? children : undefined}
      className={buttonStyles({ isActive, className })}
      data-active={isActive}
      onAction={onClick}
      {...(isActive && { 'aria-pressed': true })}
    >
      {children}
    </AriaGridListItem>
  );
}
