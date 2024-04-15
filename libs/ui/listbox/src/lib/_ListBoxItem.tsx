import { focusRing } from '@restate/ui/focus';
import { useContext, type PropsWithChildren } from 'react';
import {
  ListBoxItem as AriaListBoxItem,
  ListBoxItemProps as AriaListBoxItemProps,
  ListBoxContext,
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
  //   const aa = useContext(ListBoxContext);
  //   const b = aa?;

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
}

export function ListBoxItem({ children, ...props }: ListBoxItemProps) {
  return <StyledListBoxItem {...props} />;
}

interface ListBoxCustomItemProps
  extends PropsWithChildren<Omit<ListBoxItemProps, 'children'>> {
  value: string;
}

export function ListBoxCustomItem({
  children,
  value,
  ...props
}: PropsWithChildren<ListBoxCustomItemProps>) {
  return <StyledListBoxItem {...props} id={value} textValue={value} />;
}

interface ListBoxNavItemProps extends Omit<ListBoxCustomItemProps, 'value'> {
  href: string;
}

export function ListBoxNavItem({
  children,
  ...props
}: PropsWithChildren<ListBoxNavItemProps>) {
  return <StyledListBoxItem {...props} />;
}

export const dropdownItemStyles = tv({
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
