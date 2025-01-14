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

const tagStyles = tv({
  extend: focusRing,
  base: 'bg-white/90 border text-zinc-800 shadow-sm  flex max-w-fit cursor-default items-center gap-x-1 rounded-md pl-1.5 py-0.5 text-xs font-medium outline-0 transition ',
});
function DefaultTag<
  T extends {
    id: Key;
    textValue: string;
  }
>({ item, onRemove }: { item: T; onRemove?: VoidFunction }) {
  return (
    <div className={tagStyles()}>
      {item.textValue}
      <Button onClick={onRemove} variant="icon">
        <Icon name={IconName.X} className="w-3 h-3" />
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
}

const multiSelectStyles = tv({
  base: 'relative flex flex-row flex-wrap items-center rounded-lg border has-[input[data-focused=true]]:border-blue-500 has-[input[data-invalid=true][data-focused=true]]:border-blue-500 has-[input[data-invalid=true]]:border-destructive has-[input[data-focused=true]]:ring-1 has-[input[data-focused=true]]:ring-blue-500',
});

const inputStyles = tv({
  base: 'min-h-[2.125rem] py-1.5 pl-0 pr-10 w-full min-w-0 text-sm text-current border-0 focus:border-0 focus:shadow-none focus:ring-0 focus:outline-0 bg-transparent',
});
export function FormFieldMultiCombobox<
  T extends {
    id: Key;
    textValue: string;
  }
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
  ...props
}: MultiSelectProps<T>) {
  const { contains } = useFilter({ sensitivity: 'base' });

  const selectedKeys = selectedList.items.map((i) => i.id);

  const filter = useCallback(
    (item: T, filterText: string) => {
      return (
        !selectedKeys.includes(item.id) && contains(item.textValue, filterText)
      );
    },
    [contains, selectedKeys]
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
    },
    [selectedList, onItemRemove]
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
    [onItemUpdated, selectedList]
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
    [deleteLast, fieldState.inputValue]
  );

  const tagGroupId = useId();
  const labelId = useId();

  return (
    <FocusScope>
      <LabeledGroup id={labelId} className={multiSelectStyles({ className })}>
        <Label className="sr-only">{label}</Label>

        <div
          className="hidden gap-1.5 flex-wrap px-1 py-1 has-[>*]:flex"
          id={tagGroupId}
        >
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
          menuTrigger="focus"
          className="group flex flex-1"
          items={availableList.items}
          selectedKey={fieldState.selectedKey}
          inputValue={fieldState.inputValue}
          onSelectionChange={onSelectionChange}
          onInputChange={onInputChange}
          aria-labelledby={labelId}
        >
          <div
            className={['inline-flex flex-1 items-center gap-1 px-0 pl-1'].join(
              ' '
            )}
          >
            <MenuTrigger />
            <InputWithFocusManager
              ref={ref}
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
            <PopoverOverlay className="w-[--trigger-width] min-w-fit p-0 bg-gray-100/90">
              <ListBox
                multiple
                selectable
                className="outline-0 p-1 max-h-[inherit] overflow-auto border-none"
              >
                <ListBoxSection title={label}>
                  {availableList.items.map((item) => (
                    <ListBoxItem value={String(item.id)} key={item.id}>
                      {item.textValue}
                    </ListBoxItem>
                  ))}
                </ListBoxSection>
              </ListBox>
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
    [focusManager, onKeyDownCapture]
  );
  return <AriaInput {...props} onKeyDownCapture={onKeyDownCaptureInner} />;
}
