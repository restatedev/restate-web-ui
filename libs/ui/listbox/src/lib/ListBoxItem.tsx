import { focusRing } from '@restate/ui-focus';
import { Icon, IconName } from '@restate/ui-icons';
import type { PropsWithChildren } from 'react';
import {
  ListBoxItem as AriaListBoxItem,
  ListBoxItemProps as AriaListBoxItemProps,
  composeRenderProps,
} from 'react-aria-components';
import { tv } from '@restate/util-styles';

export const listBoxItemStyles = tv({
  extend: focusRing,
  base: 'relative flex cursor-default items-center gap-8 rounded-md px-2.5 py-1.5 text-sm will-change-transform select-none highlighted:bg-accent highlighted:text-inverse',
  variants: {
    isSelected: {
      false: 'text-secondary',
    },
    isDisabled: {
      true: 'text-subtle',
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
        listBoxItemStyles({ ...renderProps, className }),
      )}
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
    </AriaListBoxItem>
  );
}

interface BaseListBoxItemProps {
  children: string;
  value?: never;
  href?: never;
  className?: string;
  disabled?: boolean;
}

interface ListBoxCustomItemProps extends PropsWithChildren<
  Omit<BaseListBoxItemProps, 'children' | 'href' | 'value'>
> {
  value: string;
  href?: never;
}

interface ListBoxNavItemProps extends Omit<
  ListBoxCustomItemProps,
  'value' | 'href'
> {
  href: string;
  value?: never;
}

function isNavItem(
  props: BaseListBoxItemProps | ListBoxCustomItemProps | ListBoxNavItemProps,
): props is ListBoxNavItemProps {
  return Boolean(props.href);
}

function isCustomItem(
  props: BaseListBoxItemProps | ListBoxCustomItemProps | ListBoxNavItemProps,
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
    return (
      <StyledListBoxItem {...rest} isDisabled={props.disabled} href={href} />
    );
  }
  if (isCustomItem(props)) {
    const { value, ...rest } = props;
    return (
      <StyledListBoxItem
        id={value}
        textValue={value}
        {...rest}
        isDisabled={props.disabled}
      />
    );
  }
  return <StyledListBoxItem {...props} isDisabled={props.disabled} />;
}
