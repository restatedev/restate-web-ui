import {
  Menu as AriaMenu,
  MenuProps as AriaMenuProps,
} from 'react-aria-components';
import { Popover } from '@restate/ui/popover';
import { PropsWithChildren } from 'react';

function StyledMenu<T extends object>(props: AriaMenuProps<T>) {
  return (
    <AriaMenu
      {...props}
      className="p-1 outline outline-0 max-h-[inherit] overflow-auto [clip-path:inset(0_0_0_0_round_.75rem)]"
    />
  );
}

interface MenuProps {
  disabledItems?: Iterable<string>;
  ['aria-label']?: string;
  selectable?: never;
  selectedItems?: never;
  multiple?: never;
}

interface SelectableMenuProps
  extends Omit<MenuProps, 'selectable' | 'selectedItems' | 'multiple'> {
  multiple?: boolean;
  selectedItems?: Iterable<string>;
  selectable: true;
}

export function MenuList({
  multiple,
  disabledItems,
  selectedItems,
  selectable,
  ...props
}: PropsWithChildren<MenuProps | SelectableMenuProps>) {
  if (selectable) {
    return (
      <StyledMenu
        {...props}
        selectionMode={multiple ? 'multiple' : 'single'}
        disabledKeys={disabledItems}
        selectedKeys={selectedItems}
      />
    );
  } else {
    return <StyledMenu {...props} disabledKeys={disabledItems} />;
  }
}
