import { focusRing } from '@restate/ui/focus';
import type { PropsWithChildren } from 'react';
import {
  ListBoxItem as AriaListBoxItem,
  ListBoxItemProps as AriaListBoxItemProps,
  composeRenderProps,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';

export const listBoxItemStyles = tv({
  extend: focusRing,
  base: 'group relative flex items-center gap-8 cursor-default select-none py-1.5 px-2.5 rounded-md will-change-transform text-sm forced-color-adjust-none',
  variants: {
    isSelected: {
      false:
        'text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 -outline-offset-2',
      true: 'bg-blue-600 text-white forced-colors:bg-[Highlight] forced-colors:text-[HighlightText] [&:has(+[data-selected])]:rounded-b-none [&+[data-selected]]:rounded-t-none -outline-offset-4 outline-white dark:outline-white forced-colors:outline-[HighlightText]',
    },
    isDisabled: {
      true: 'text-slate-300 dark:text-zinc-600 forced-colors:text-[GrayText]',
    },
  },
});

function StyledListBoxItem(props: AriaListBoxItemProps) {
  const textValue =
    props.textValue ||
    (typeof props.children === 'string' ? props.children : undefined);

  return (
    <AriaListBoxItem
      {...props}
      textValue={textValue}
      className={listBoxItemStyles}
    >
      {composeRenderProps(props.children, (children) => (
        <>
          {children}
          <div className="absolute left-4 right-4 bottom-0 h-px bg-white/20 forced-colors:bg-[HighlightText] hidden [.group[data-selected]:has(+[data-selected])_&]:block" />
        </>
      ))}
    </AriaListBoxItem>
  );
}

interface ListBoxItemProps {
  children: string;
  value?: never;
  href?: never;
}

interface ListBoxCustomItemProps
  extends PropsWithChildren<
    Omit<ListBoxItemProps, 'children' | 'href' | 'value'>
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
  props: ListBoxItemProps | ListBoxCustomItemProps | ListBoxNavItemProps
): props is ListBoxNavItemProps {
  return Boolean(props.href);
}

function isCustomItem(
  props: ListBoxItemProps | ListBoxCustomItemProps | ListBoxNavItemProps
): props is ListBoxCustomItemProps {
  return typeof props.value === 'string';
}

export function ListBoxItem(
  props: ListBoxItemProps | ListBoxCustomItemProps | ListBoxNavItemProps
) {
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
