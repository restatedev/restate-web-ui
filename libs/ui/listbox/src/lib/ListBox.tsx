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
        'outline-0 p-1 border border-gray-300 dark:border-zinc-600 rounded-md'
      }
    />
  );
}

interface ListBoxProps {
  disabledItems?: Iterable<string>;
  ['aria-label']?: string;
  selectable?: never;
  selectedItems?: never;
  multiple?: never;
}

interface SelectableListBoxProps
  extends Omit<ListBoxProps, 'selectable' | 'selectedItems' | 'multiple'> {
  multiple?: boolean;
  selectedItems?: Iterable<string>;
  selectable: true;
}

export function ListBox({
  multiple,
  disabledItems,
  selectedItems,
  selectable,
  ...props
}: PropsWithChildren<ListBoxProps | SelectableListBoxProps>) {
  if (selectable) {
    return (
      <StyledListBox
        {...props}
        selectionMode={multiple ? 'multiple' : 'single'}
        disabledKeys={disabledItems}
        selectedKeys={selectedItems}
      />
    );
  } else {
    return <StyledListBox {...props} disabledKeys={disabledItems} />;
  }
}
