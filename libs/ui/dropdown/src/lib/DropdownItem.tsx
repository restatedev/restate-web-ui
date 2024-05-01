import { Icon, IconName } from '@restate/ui/icons';
import type { PropsWithChildren } from 'react';
import {
  MenuItem as AriaMenuItem,
  MenuItemProps as AriaMenuItemProps,
  composeRenderProps,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'group flex rounded-xl items-center gap-4 cursor-default select-none py-2 px-3 outline outline-0 text-sm forced-color-adjust-none',
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

const destructiveStyles = tv({
  base: 'group flex rounded-xl items-center gap-4 cursor-default select-none py-2 px-3 outline outline-0 text-sm forced-color-adjust-none',
  variants: {
    isDisabled: {
      false: 'text-red-600 dark:text-zinc-100',
      true: 'text-gray-300 dark:text-zinc-600 forced-colors:text-[GrayText]',
    },
    isFocused: {
      true: 'bg-red-600 text-white forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]',
    },
  },
});

function StyledDropdownItem({
  destructive,
  ...props
}: AriaMenuItemProps & { destructive?: boolean }) {
  return (
    <AriaMenuItem
      {...props}
      className={destructive ? destructiveStyles : styles}
    >
      {composeRenderProps(
        props.children,
        (children, { selectionMode, isSelected }) => (
          <>
            <span className="flex items-center flex-1 gap-2 font-normal truncate group-selected:font-semibold">
              {children}
            </span>
            {selectionMode !== 'none' && (
              <span className="flex items-center w-4">
                {isSelected && <Icon name={IconName.Check} aria-hidden />}
              </span>
            )}
          </>
        )
      )}
    </AriaMenuItem>
  );
}

interface DropdownItemProps
  extends PropsWithChildren<{
    value?: never;
    href?: never;
  }> {
  destructive?: boolean;
  className?: string;
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
  value?: string;
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
    const { href, value, ...rest } = props;
    return (
      <StyledDropdownItem {...rest} href={href} id={value} textValue={value} />
    );
  }
  if (isCustomItem(props)) {
    const { value, ...rest } = props;
    return <StyledDropdownItem id={value} textValue={value} {...rest} />;
  }
  return <StyledDropdownItem {...props} />;
}
