import {
  useCallback,
  useState,
  KeyboardEvent,
  useId,
  ComponentType,
  ReactNode,
  Fragment,
  RefObject,
  PropsWithChildren,
  ComponentProps,
  useRef,
} from 'react';
import {
  ComboBox,
  ComboBoxProps as RACComboBoxProps,
  Key,
  Input as AriaInput,
  Label,
  InputProps,
} from 'react-aria-components';
import { useListData, ListData } from 'react-stately';
import { FocusScope, useFilter, useFocusManager } from 'react-aria';
import { ListBox, ListBoxItem, ListBoxSection } from '@restate/ui/listbox';
import { LabeledGroup } from './LabeledGroup';
import { tv } from 'tailwind-variants';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { PopoverOverlay } from '@restate/ui/popover';
import { focusRing } from '@restate/ui/focus';
import { mergeRefs, useObjectRef } from '@react-aria/utils';

const tagStyles = tv({
  extend: focusRing,
  base: 'flex max-w-fit cursor-default items-center gap-x-1 rounded-md border bg-white/90 py-0.5 pl-1.5 text-xs font-medium text-zinc-800 shadow-xs outline-0 transition',
});
function DefaultTag<
  T extends {
    id: Key;
    textValue: string;
  },
>({ item, onRemove }: { item: T; onRemove?: VoidFunction }) {
  return (
    <div className={tagStyles()}>
      {item.textValue}
      <Button onClick={onRemove} variant="icon">
        <Icon name={IconName.X} className="h-3 w-3" />
      </Button>
    </div>
  );
}

function DefaultMenuTrigger() {
  return null;
}

export interface MultiSelectProps<T extends object>
  extends Omit<
    RACComboBoxProps<T>,
    | 'children'
    | 'validate'
    | 'allowsEmptyCollection'
    | 'inputValue'
    | 'selectedKey'
    | 'inputValue'
    | 'className'
    | 'value'
    | 'onSelectionChange'
    | 'onInputChange'
  > {
  items: Array<T>;
  selectedList: ListData<T>;
  className?: string;
  onItemAdd?: (key: Key) => void;
  onItemRemove?: (key: Key) => void;
  onItemUpdated?: (key: Key) => void;
  renderEmptyState?: (inputValue: string) => React.ReactNode;
  children?: (props: {
    item: T;
    onRemove?: VoidFunction;
    onUpdate?: (newValue: T) => void;
  }) => ReactNode;
  MenuTrigger?: ComponentType<unknown>;
  label: string;
  placeholder?: string;
  ref?: RefObject<HTMLInputElement | null>;
  prefix?: ReactNode;
  disabled?: boolean;
  multiple?: boolean;
}

const multiSelectStyles = tv({
  base: 'has-[input[data-invalid=true]]:border-destructive relative flex flex-row flex-wrap items-center rounded-lg border has-[input[data-focused=true]]:border-blue-500 has-[input[data-focused=true]]:ring-1 has-[input[data-focused=true]]:ring-blue-500 has-[input[data-invalid=true][data-focused=true]]:border-blue-500',
});

const inputStyles = tv({
  base: 'min-h-8.5 w-full min-w-0 border-0 bg-transparent py-1.5 pr-10 pl-0 text-sm text-current focus:border-0 focus:shadow-none focus:ring-0 focus:outline-0',
});
export function FormFieldMultiCombobox<
  T extends {
    id: Key;
    textValue: string;
  },
>({
  label,
  items,
  selectedList,
  onItemRemove,
  onItemAdd,
  onItemUpdated,
  className,
  name,
  renderEmptyState,
  children = DefaultTag,
  MenuTrigger = DefaultMenuTrigger,
  placeholder,
  ref,
  prefix,
  disabled,
  multiple,
  ...props
}: MultiSelectProps<T>) {
  const { contains } = useFilter({ sensitivity: 'base' });

  const selectedKeys = selectedList.items.map((i) => i.id);
  const [menuTrigger, setMenuTrigger] =
    useState<ComponentProps<typeof ComboBox>['menuTrigger']>('focus');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputRefObject = useObjectRef(mergeRefs(inputRef, ref));

  const filter = useCallback(
    (item: T, filterText: string) => {
      return (
        !selectedKeys.includes(item.id) && contains(item.textValue, filterText)
      );
    },
    [contains, selectedKeys],
  );

  const availableList = useListData({
    initialItems: items,
    filter,
  });

  const [fieldState, setFieldState] = useState<{
    selectedKey: Key | null;
    inputValue: string;
  }>({
    selectedKey: null,
    inputValue: '',
  });

  const onRemove = useCallback(
    (key: Key) => {
      selectedList.remove(key);
      setFieldState({
        inputValue: '',
        selectedKey: null,
      });
      onItemRemove?.(key);
      setMenuTrigger('input');
      setTimeout(() => {
        inputRefObject?.current?.focus();
        setMenuTrigger('focus');
      });
    },
    [selectedList, onItemRemove, inputRefObject],
  );

  const onUpdate = useCallback(
    (newValue: T) => {
      selectedList.update(newValue.id, newValue);
      setFieldState({
        inputValue: '',
        selectedKey: null,
      });
      onItemUpdated?.(newValue.id);
    },
    [onItemUpdated, selectedList],
  );

  const onSelectionChange = (id: Key | null) => {
    if (!id) {
      return;
    }

    const item = availableList.getItem(id);

    if (!item) {
      return;
    }

    if (!selectedKeys.includes(id)) {
      selectedList.append(item);
      setFieldState({
        inputValue: '',
        selectedKey: id,
      });
      onItemAdd?.(id);
    }

    availableList.setFilterText('');
  };

  const onInputChange = (value: string) => {
    setFieldState((prevState) => ({
      inputValue: value,
      selectedKey: value === '' ? null : prevState.selectedKey,
    }));

    availableList.setFilterText(value);
  };

  const deleteLast = useCallback(() => {
    if (selectedList.items.length === 0) {
      return;
    }

    const lastKey = selectedList.items[selectedList.items.length - 1];

    if (lastKey) {
      selectedList.remove(lastKey.id);
      onItemRemove?.(lastKey.id);
    }

    setFieldState({
      inputValue: '',
      selectedKey: null,
    });
  }, [selectedList, onItemRemove]);

  const onKeyDownCapture = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && fieldState.inputValue === '') {
        deleteLast();
      }
    },
    [deleteLast, fieldState.inputValue],
  );

  const tagGroupId = useId();
  const labelId = useId();

  return (
    <FocusScope>
      <LabeledGroup id={labelId} className={multiSelectStyles({ className })}>
        <Label className="sr-only">{label}</Label>

        <div
          className="hidden max-w-full flex-wrap gap-1.5 px-1 py-1 has-[>*]:flex"
          id={tagGroupId}
        >
          {prefix}
          {selectedList.items.map((item) => (
            <TagFocusManager
              key={item.id}
              onRemove={onRemove.bind(null, item.id)}
            >
              {children({
                item,
                onRemove: onRemove.bind(null, item.id),
                onUpdate,
              })}
            </TagFocusManager>
          ))}
        </div>

        <ComboBox
          {...props}
          allowsEmptyCollection
          menuTrigger={menuTrigger}
          className="group flex flex-1"
          items={availableList.items}
          selectedKey={fieldState.selectedKey}
          inputValue={fieldState.inputValue}
          onSelectionChange={onSelectionChange}
          onInputChange={onInputChange}
          aria-labelledby={labelId}
          isDisabled={disabled}
        >
          <div className={'inline-flex flex-1 items-center gap-1 px-0 pl-1'}>
            <MenuTrigger />
            <InputWithFocusManager
              ref={inputRefObject}
              className={inputStyles()}
              onBlur={() => {
                setFieldState({
                  inputValue: '',
                  selectedKey: null,
                });
                availableList.setFilterText('');
              }}
              aria-describedby={tagGroupId}
              onKeyDownCapture={onKeyDownCapture}
              placeholder={placeholder}
              type="search"
            />
          </div>

          {availableList.items.length > 0 && (
            <PopoverOverlay className="w-(--trigger-width) min-w-fit bg-gray-100/90 p-0">
              {multiple || selectedKeys.length === 0 ? (
                <ListBox
                  multiple
                  selectable
                  className="max-h-[inherit] overflow-auto border-none p-1 outline-0"
                >
                  <ListBoxSection title={label}>
                    {availableList.items.map((item) => (
                      <ListBoxItem value={String(item.id)} key={item.id}>
                        {item.textValue}
                      </ListBoxItem>
                    ))}
                  </ListBoxSection>
                </ListBox>
              ) : (
                <div className="flex items-center gap-1.5 px-4 py-2 text-sm text-zinc-500">
                  You can apply only one filter at a time.
                </div>
              )}
            </PopoverOverlay>
          )}
        </ComboBox>
      </LabeledGroup>

      {name && (
        <>
          {selectedKeys.map((key) => (
            <input hidden name={name} value={key} readOnly key={key} />
          ))}
        </>
      )}
    </FocusScope>
  );
}

function TagFocusManager({
  children,
  onRemove,
}: PropsWithChildren<{ onRemove?: VoidFunction }>) {
  const focusManager = useFocusManager();
  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Backspace':
        onRemove?.();
        break;
      case 'ArrowRight':
        focusManager?.focusNext({ wrap: true });
        break;
      case 'ArrowLeft':
        focusManager?.focusPrevious({ wrap: true });
        break;
    }
  };

  return (
    <div className="contents" onKeyDown={onKeyDown}>
      {children}
    </div>
  );
}

function InputWithFocusManager({
  onKeyDownCapture,
  ...props
}: Pick<
  InputProps,
  'onBlur' | 'className' | 'onKeyDownCapture' | 'placeholder' | 'type'
> & { ref?: RefObject<HTMLInputElement | null> }) {
  const focusManager = useFocusManager();

  const onKeyDownCaptureInner = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      onKeyDownCapture?.(e);

      switch (e.key) {
        case 'ArrowRight':
          if (
            e.currentTarget.selectionStart === e.currentTarget.value.length &&
            e.currentTarget.selectionEnd === e.currentTarget.value.length
          ) {
            focusManager?.focusNext({ wrap: true });
          }
          break;
        case 'ArrowLeft':
          if (
            e.currentTarget.selectionStart === 0 &&
            e.currentTarget.selectionEnd === 0
          ) {
            focusManager?.focusPrevious({ wrap: true });
          }
          break;
      }
    },
    [focusManager, onKeyDownCapture],
  );
  return <AriaInput {...props} onKeyDownCapture={onKeyDownCaptureInner} />;
}
