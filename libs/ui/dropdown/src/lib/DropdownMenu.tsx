import {
  Menu as AriaMenu,
  MenuProps as AriaMenuProps,
} from 'react-aria-components';
import { PropsWithChildren } from 'react';
import { tv } from '@restate/util/styles';
import type { Key, Selection } from 'react-aria-components';

export type DropdownMenuSelection = Selection;

const styles = tv({
  base: 'dropdown-menu max-h-[inherit] overflow-auto p-1 outline outline-0 [clip-path:inset(0_0_0_0_round_.75rem)] [&~.dropdown-menu]:pt-0',
});
function StyledDropdownMenu<T extends object>({
  className,
  ...props
}: Omit<AriaMenuProps<T>, 'className'> & { className?: string }) {
  return <AriaMenu {...props} className={styles({ className })} />;
}

export interface DropdownMenuProps {
  disabledItems?: Iterable<string>;
  ['aria-label']?: string;
  selectable?: never;
  selectedItems?: never;
  multiple?: never;
  onSelect?: (key: string) => void;
  className?: string;
  autoFocus?: boolean;
}

export type SelectableDropdownMenuProps = Omit<
  DropdownMenuProps,
  'selectable' | 'selectedItems' | 'multiple' | 'onSelect'
> &
  (
    | {
        selectable: true;

        multiple?: false;
        onSelect?: (key: string) => void;
        selectedItems: Iterable<Key>;
      }
    | {
        selectable: true;

        multiple: true;
        onSelect?: (keys: DropdownMenuSelection) => void;
        selectedItems?: 'all' | Iterable<Key> | undefined;
      }
  );

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
        {...(multiple && {
          onSelectionChange(keys) {
            onSelect?.(keys);
          },
        })}
        {...(!multiple && {
          onAction(key) {
            onSelect?.(String(key));
          },
        })}
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
