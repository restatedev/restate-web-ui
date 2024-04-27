import {
  Menu as AriaMenu,
  MenuProps as AriaMenuProps,
} from 'react-aria-components';
import { PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'p-1 outline outline-0 max-h-[inherit] overflow-auto [clip-path:inset(0_0_0_0_round_.75rem)]',
});
function StyledDropdownMenu<T extends object>({
  className,
  ...props
}: AriaMenuProps<T>) {
  return <AriaMenu {...props} className={styles({ className })} />;
}

interface DropdownMenuProps {
  disabledItems?: Iterable<string>;
  ['aria-label']?: string;
  selectable?: never;
  selectedItems?: never;
  multiple?: never;
  onSelect?: (key: string) => void;
  className?: string;
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
  className,
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
        className={className}
      />
    );
  } else {
    return (
      <StyledDropdownMenu
        {...props}
        disabledKeys={disabledItems}
        onAction={(key) => onSelect?.(String(key))}
        className={className}
      />
    );
  }
}
