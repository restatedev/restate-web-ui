import { PropsWithChildren } from 'react';
import {
  ListBox as AriaListBox,
  ListBoxProps as AriaListBoxProps,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'outline-0 p-1 border border-gray-300 flex flex-col gap-1 rounded-md',
});

export function StyledListBox<T extends object>({
  className,
  ...props
}: Omit<AriaListBoxProps<T>, 'layout' | 'orientation' | 'className'> & {
  className?: string;
}) {
  return <AriaListBox {...props} className={styles({ className })} />;
}

interface ListBoxProps {
  disabledItems?: Iterable<string>;
  ['aria-label']?: string;
  selectable?: never;
  selectedItems?: never;
  multiple?: never;
  className?: string;
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
