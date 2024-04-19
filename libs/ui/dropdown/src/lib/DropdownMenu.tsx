import {
  Menu as AriaMenu,
  MenuProps as AriaMenuProps,
} from 'react-aria-components';
import { PropsWithChildren } from 'react';

function StyledDropdownMenu<T extends object>(props: AriaMenuProps<T>) {
  return (
    <AriaMenu
      {...props}
      className="p-1 outline outline-0 max-h-[inherit] overflow-auto [clip-path:inset(0_0_0_0_round_.75rem)]"
    />
  );
}

interface DropdownMenuProps {
  disabledItems?: Iterable<string>;
  ['aria-label']?: string;
  selectable?: never;
  selectedItems?: never;
  multiple?: never;
  onSelect?: (key: string) => void;
}

interface SelectableDropdownMenuProps
  extends Omit<DropdownMenuProps, 'selectable' | 'selectedItems' | 'multiple'> {
  multiple?: boolean;
  selectedItems?: Iterable<string>;
  selectable: true;
}

export function DropdownMenu({
  multiple,
  disabledItems,
  selectedItems,
  selectable,
  onSelect,
  ...props
}: PropsWithChildren<DropdownMenuProps | SelectableDropdownMenuProps>) {
  if (selectable) {
    return (
      <StyledDropdownMenu
        {...props}
        selectionMode={multiple ? 'multiple' : 'single'}
        disabledKeys={disabledItems}
        selectedKeys={selectedItems}
        onAction={(key) => onSelect?.(String(key))}
      />
    );
  } else {
    return (
      <StyledDropdownMenu
        {...props}
        disabledKeys={disabledItems}
        onAction={(key) => onSelect?.(String(key))}
      />
    );
  }
}
