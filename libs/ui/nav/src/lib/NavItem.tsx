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
  const isActive = location.pathname + location.search === href;
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
