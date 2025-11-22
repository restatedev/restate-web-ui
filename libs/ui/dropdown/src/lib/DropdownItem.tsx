import { Icon, IconName } from '@restate/ui/icons';
import { useHrefWithQueryParams } from '@restate/ui/link';
import type { PropsWithChildren } from 'react';
import {
  MenuItem as AriaMenuItem,
  MenuItemProps as AriaMenuItemProps,
  composeRenderProps,
} from 'react-aria-components';
import { tv } from '@restate/util/styles';

const styles = tv({
  base: 'group dropdown-item flex cursor-default items-center gap-4 rounded-xl px-3 py-2 text-sm outline outline-0 forced-color-adjust-none select-none',
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
  base: 'group dropdown-item flex cursor-default items-center gap-4 rounded-xl px-3 py-2 text-sm outline outline-0 forced-color-adjust-none select-none',
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
  className,
  ...props
}: Omit<AriaMenuItemProps, 'className'> & {
  destructive?: boolean;
  className?: string;
}) {
  return (
    <AriaMenuItem
      {...props}
      className={({ isFocused, isDisabled }) =>
        destructive
          ? destructiveStyles({ className, isDisabled, isFocused })
          : styles({ className, isDisabled, isFocused })
      }
    >
      {composeRenderProps(
        props.children,
        (children, { selectionMode, isSelected }) => (
          <>
            <span className="flex flex-1 items-center gap-2 truncate font-normal group-selected:font-semibold">
              {children}
            </span>
            {selectionMode !== 'none' && (
              <span className="flex w-4 items-center">
                {isSelected && <Icon name={IconName.Check} aria-hidden />}
              </span>
            )}
          </>
        ),
      )}
    </AriaMenuItem>
  );
}

interface BaseDropdownItemProps
  extends PropsWithChildren<{
    value?: never;
    href?: never;
  }> {
  destructive?: boolean;
  className?: string;
}

interface DropdownCustomItemProps
  extends PropsWithChildren<
    Omit<BaseDropdownItemProps, 'children' | 'href' | 'value'>
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
  props: BaseDropdownItemProps | DropdownCustomItemProps | DropdownNavItemProps,
): props is DropdownNavItemProps {
  return Boolean(props.href);
}

function isCustomItem(
  props: BaseDropdownItemProps | DropdownCustomItemProps | DropdownNavItemProps,
): props is DropdownCustomItemProps {
  return typeof props.value === 'string';
}

export type DropdownItemProps =
  | BaseDropdownItemProps
  | DropdownCustomItemProps
  | DropdownNavItemProps;

export function DropdownItem(props: DropdownItemProps) {
  const hrefWithQUeryParams = useHrefWithQueryParams({
    href: props.href,
    preserveQueryParams: true,
    mode: 'append',
  });

  if (isNavItem(props)) {
    const { href, value, ...rest } = props;
    return (
      <StyledDropdownItem
        {...rest}
        href={hrefWithQUeryParams}
        id={value}
        textValue={value}
      />
    );
  }
  if (isCustomItem(props)) {
    const { value, ...rest } = props;
    return <StyledDropdownItem id={value} textValue={value} {...rest} />;
  }
  return <StyledDropdownItem {...props} />;
}
