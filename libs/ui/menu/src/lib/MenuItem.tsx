import { Icon, IconName } from '@restate/ui/icons';
import type { PropsWithChildren } from 'react';
import {
  MenuItem as AriaMenuItem,
  MenuItemProps as AriaMenuItemPropss,
  composeRenderProps,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';

const dropdownItemStyles = tv({
  base: 'group flex items-center gap-4 cursor-default select-none py-2 pl-3 pr-1 rounded-lg outline outline-0 text-sm forced-color-adjust-none',
  variants: {
    isDisabled: {
      false: 'text-gray-900 dark:text-zinc-100',
      true: 'text-gray-300 dark:text-zinc-600 forced-colors:text-[GrayText]',
    },
    isFocused: {
      true: 'bg-blue-600 text-white forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]',
    },
  },
});

function StyledMenuItem(props: AriaMenuItemPropss) {
  return (
    <AriaMenuItem {...props} className={dropdownItemStyles}>
      {composeRenderProps(
        props.children,
        (children, { selectionMode, isSelected }) => (
          <>
            {selectionMode !== 'none' && (
              <span className="flex items-center w-4">
                {isSelected && <Icon name={IconName.Check} aria-hidden />}
              </span>
            )}
            <span className="flex items-center flex-1 gap-2 font-normal truncate group-selected:font-semibold">
              {children}
            </span>
          </>
        )
      )}
    </AriaMenuItem>
  );
}

interface MenuItemProps {
  children: string;
}

export function MenuItem(props: MenuItemProps) {
  return <StyledMenuItem {...props} />;
}

interface MenuCustomItemProps
  extends PropsWithChildren<Omit<MenuItemProps, 'children'>> {
  value: string;
}

export function MenuCustomItem({
  value,
  ...props
}: PropsWithChildren<MenuCustomItemProps>) {
  return <StyledMenuItem {...props} id={value} textValue={value} />;
}

interface MenuNavItemProps extends Omit<MenuCustomItemProps, 'value'> {
  href: string;
}

export function MenuNavItem(props: PropsWithChildren<MenuNavItemProps>) {
  return <StyledMenuItem {...props} />;
}
