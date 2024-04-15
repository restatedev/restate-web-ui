import { PropsWithChildren } from 'react';
import {
  ListBox as AriaListBox,
  ListBoxProps as AriaListBoxProps,
} from 'react-aria-components';

export function StyledListBox<T extends object>({
  children,
  ...props
}: Omit<AriaListBoxProps<T>, 'layout' | 'orientation'>) {
  return (
    <AriaListBox
      {...props}
      className={
        'outline-0 p-1 border border-gray-300 dark:border-zinc-600 rounded-lg'
      }
    >
      {children}
    </AriaListBox>
  );
}

interface ListBoxProps {
  disabledItems?: Iterable<string>;
  ['aria-label']?: string;
}

export function ListBox({
  children,
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
  children,
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
