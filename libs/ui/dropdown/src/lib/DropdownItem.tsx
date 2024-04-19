import { Icon, IconName } from '@restate/ui/icons';
import type { PropsWithChildren } from 'react';
import {
  MenuItem as AriaMenuItem,
  MenuItemProps as AriaMenuItemProps,
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

function StyledDropdownItem(props: AriaMenuItemProps) {
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

interface DropdownItemProps {
  children: string;
  value?: never;
  href?: never;
}

interface DropdownCustomItemProps
  extends PropsWithChildren<
    Omit<DropdownItemProps, 'children' | 'href' | 'value'>
  > {
  value: string;
  href?: never;
}

interface DropdownNavItemProps
  extends Omit<DropdownCustomItemProps, 'value' | 'href'> {
  href: string;
  value?: never;
}

function isNavItem(
  props: DropdownItemProps | DropdownCustomItemProps | DropdownNavItemProps
): props is DropdownNavItemProps {
  return Boolean(props.href);
}

function isCustomItem(
  props: DropdownItemProps | DropdownCustomItemProps | DropdownNavItemProps
): props is DropdownCustomItemProps {
  return typeof props.value === 'string';
}

export function DropdownItem(
  props: DropdownItemProps | DropdownCustomItemProps | DropdownNavItemProps
) {
  if (isNavItem(props)) {
    const { href, ...rest } = props;
    return <StyledDropdownItem {...rest} href={href} />;
  }
  if (isCustomItem(props)) {
    const { value, ...rest } = props;
    return <StyledDropdownItem id={value} textValue={value} {...rest} />;
  }
  return <StyledDropdownItem {...props} />;
}