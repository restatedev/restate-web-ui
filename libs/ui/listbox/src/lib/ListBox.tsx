import { PropsWithChildren } from 'react';
import {
  ListBox as AriaListBox,
  ListBoxProps as AriaListBoxProps,
} from 'react-aria-components';

export function StyledListBox<T extends object>(
  props: Omit<AriaListBoxProps<T>, 'layout' | 'orientation'>
) {
  return (
    <AriaListBox
      {...props}
      className={
        'outline-0 p-1 border border-gray-300 dark:border-zinc-600 rounded-lg'
      }
    />
  );
}

interface ListBoxProps {
  disabledItems?: Iterable<string>;
  ['aria-label']?: string;
}

export function ListBox({
  disabledItems,
  ...props
}: PropsWithChildren<ListBoxProps>) {
  return <StyledListBox {...props} disabledKeys={disabledItems} />;
}

interface SelectListBoxProps extends ListBoxProps {
  multiple?: boolean;
  selectedItems?: Iterable<string>;
}

export function SelectListBoxProps({
  multiple,
  disabledItems,
  selectedItems,
  ...props
}: PropsWithChildren<SelectListBoxProps>) {
  return (
    <StyledListBox
      {...props}
      selectionMode={multiple ? 'multiple' : 'single'}
      disabledKeys={disabledItems}
      selectedKeys={selectedItems}
    />
  );
}
