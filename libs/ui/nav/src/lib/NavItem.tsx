import { useLocation, useNavigation } from 'react-router';
import { GridListItem as AriaGridListItem } from 'react-aria-components';
import { useHrefWithQueryParams } from '@restate/ui-link';
import { PropsWithChildren, useCallback, useContext } from 'react';
import { tv } from '@restate/util-styles';
import { NavContext } from './NavContext';

interface NavItemProps {
  href: string;
  preserveSearchParams?: boolean | string[];
  disabled?: boolean;
  className?: string;
}

const styles = tv({
  base: 'group isolate flex cursor-default rounded-xl px-3 py-1.5 text-center text-sm no-underline outline-offset-2 outline-focus transition hover:bg-tint-subtle focus-visible:outline-2 pressed:bg-emphasis',
  variants: {
    isCurrent: {
      true: 'font-medium text-secondary',
      false: 'text-muted',
    },
    isDisabled: {
      true: 'text-subtle',
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
  className,
}: PropsWithChildren<NavItemProps>) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(href);
  const { value } = useContext(NavContext);
  const resolvedHref = useHrefWithQueryParams({
    preserveQueryParams: preserveSearchParams,
    href,
  });
  return (
    <AriaGridListItem
      textValue={typeof children === 'string' ? children : undefined}
      href={resolvedHref}
      className={styles({
        isCurrent: isActive,
        isDisabled: disabled,
        className,
      })}
      data-active={isActive}
      {...(isActive && { 'aria-current': value })}
    >
      {children}
    </AriaGridListItem>
  );
}

interface NavSearchItemProps {
  param: string;
  value?: string;
  className?: string;
}

export function useGetHrefFromSearch() {
  const currentLocation = useLocation();
  const { location: nextLocation, state } = useNavigation();
  const location = state === 'loading' ? nextLocation : currentLocation;

  const getHref = useCallback(
    (param: string, value?: string) => {
      const currentSearchParams = new URLSearchParams(location.search);
      currentSearchParams.sort();
      const withNewParams = new URLSearchParams(location.search);
      withNewParams.delete(param);
      if (value !== undefined) {
        withNewParams.set(param, value);
      }
      const withNewParamsSorted = new URLSearchParams(withNewParams);
      withNewParamsSorted.sort();

      const targetSearch = withNewParams.toString();
      return {
        href: `${location.pathname}${targetSearch ? `?${targetSearch}` : ''}${location.hash}`,
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
  param,
  value,
  className,
}: PropsWithChildren<NavSearchItemProps>) {
  const getHref = useGetHrefFromSearch();
  const { href, isActive } = getHref(param, value);
  const { value: ariaCurrentValue } = useContext(NavContext);

  return (
    <AriaGridListItem
      textValue={typeof children === 'string' ? children : undefined}
      href={href}
      className={styles({ className })}
      data-active={isActive}
      {...(isActive && { 'aria-current': ariaCurrentValue })}
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
  base: 'group isolate flex cursor-default rounded-xl border-none bg-transparent px-3 py-1.5 text-center font-sans text-xs no-underline shadow-none transition hover:bg-tint-subtle pressed:bg-tint',
  variants: {
    isActive: {
      true: 'text-primary',
      false: 'text-tertiary',
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
