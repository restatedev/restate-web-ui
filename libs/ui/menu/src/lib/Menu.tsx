import {
  Menu as AriaMenu,
  MenuProps as AriaMenuProps,
} from 'react-aria-components';
import { ListboxSection, ListboxSectionProps } from '@restate/ui/listbox';
import { Popover } from '@restate/ui/popover';
import { PropsWithChildren } from 'react';

function StyledMenu<T extends object>(props: AriaMenuProps<T>) {
  return (
    <Popover className="min-w-[150px]">
      <AriaMenu
        {...props}
        className="p-1 outline outline-0 max-h-[inherit] overflow-auto [clip-path:inset(0_0_0_0_round_.75rem)]"
      />
    </Popover>
  );
}

interface MenuProps {
  disabledItems?: Iterable<string>;
  ['aria-label']?: string;
}

export function Menu({
  disabledItems,
  ...props
}: PropsWithChildren<MenuProps>) {
  return <StyledMenu {...props} disabledKeys={disabledItems} />;
}

interface SelectableMenuProps extends MenuProps {
  multiple?: boolean;
  selectedItems?: Iterable<string>;
}

export function SelectableMenu({
  multiple,
  disabledItems,
  selectedItems,
  ...props
}: PropsWithChildren<SelectableMenuProps>) {
  return (
    <StyledMenu
      {...props}
      selectionMode={multiple ? 'multiple' : 'single'}
      disabledKeys={disabledItems}
      selectedKeys={selectedItems}
    />
  );
}
