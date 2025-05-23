import { focusRing } from '@restate/ui/focus';
import { Icon, IconName } from '@restate/ui/icons';
import type { PropsWithChildren } from 'react';
import {
  ListBoxItem as AriaListBoxItem,
  ListBoxItemProps as AriaListBoxItemProps,
  composeRenderProps,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';

export const listBoxItemStyles = tv({
  extend: focusRing,
  base: 'peer relative flex items-center gap-8 cursor-default select-none py-1.5 px-2.5 rounded-md will-change-transform text-sm',
  variants: {
    isSelected: {
      false: 'text-gray-700 hover:bg-blue-600 hover:text-white',
      true: 'peer-focus:bg-transparent peer-hover:bg-transparent peer-focus:text-gray-700 peer-hover:text-gray-700 focus:bg-blue-600 hover:text-white focus:bg-blue-600 hover:text-white',
    },
    isDisabled: {
      true: 'text-slate-300',
    },
    isFocused: {
      true: 'bg-blue-600 text-white',
    },
  },
});

function StyledListBoxItem({
  className,
  ...props
}: Omit<AriaListBoxItemProps, 'className'> & { className?: string }) {
  const textValue =
    props.textValue ||
    (typeof props.children === 'string' ? props.children : undefined);

  return (
    <AriaListBoxItem
      {...props}
      textValue={textValue}
      className={composeRenderProps(className, (className, renderProps) =>
        listBoxItemStyles({ ...renderProps, className })
      )}
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
    </AriaListBoxItem>
  );
}

interface BaseListBoxItemProps {
  children: string;
  value?: never;
  href?: never;
  className?: string;
}

interface ListBoxCustomItemProps
  extends PropsWithChildren<
    Omit<BaseListBoxItemProps, 'children' | 'href' | 'value'>
  > {
  value: string;
  href?: never;
}

interface ListBoxNavItemProps
  extends Omit<ListBoxCustomItemProps, 'value' | 'href'> {
  href: string;
  value?: never;
}

function isNavItem(
  props: BaseListBoxItemProps | ListBoxCustomItemProps | ListBoxNavItemProps
): props is ListBoxNavItemProps {
  return Boolean(props.href);
}

function isCustomItem(
  props: BaseListBoxItemProps | ListBoxCustomItemProps | ListBoxNavItemProps
): props is ListBoxCustomItemProps {
  return typeof props.value === 'string';
}

export type ListBoxItemProps =
  | BaseListBoxItemProps
  | ListBoxCustomItemProps
  | ListBoxNavItemProps;

export function ListBoxItem(props: ListBoxItemProps) {
  if (isNavItem(props)) {
    const { href, ...rest } = props;
    return <StyledListBoxItem {...rest} href={href} />;
  }
  if (isCustomItem(props)) {
    const { value, ...rest } = props;
    return <StyledListBoxItem id={value} textValue={value} {...rest} />;
  }
  return <StyledListBoxItem {...props} />;
}
