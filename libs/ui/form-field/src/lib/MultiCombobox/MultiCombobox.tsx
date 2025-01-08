import {
  useCallback,
  useState,
  KeyboardEvent,
  useId,
  ComponentType,
} from 'react';
import {
  ComboBox,
  ComboBoxProps as RACComboBoxProps,
  Key,
  Input as AriaInput,
  Label,
} from 'react-aria-components';
import { useListData, ListData } from 'react-stately';
import { useFilter } from 'react-aria';
import { ListBox, ListBoxItem, ListBoxSection } from '@restate/ui/listbox';
import { Tag, TagGroup, TagList } from './TagGroup';
import { LabeledGroup } from './LabeledGroup';
import { tv } from 'tailwind-variants';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { PopoverOverlay } from '@restate/ui/popover';

function DefaultTag<
  T extends {
    id: Key;
    textValue: string;
  }
>({ item }: { item: T }) {
  return <Tag id={item.id}>{item.textValue}</Tag>;
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
  renderEmptyState?: (inputValue: string) => React.ReactNode;
  Tag?: ComponentType<{ item: T }>;
  label: string;
}

const multiSelectStyles = tv({
  base: 'relative flex flex-row flex-wrap items-center rounded-lg border has-[input[data-focused=true]]:border-blue-500 has-[input[data-invalid=true][data-focused=true]]:border-blue-500 has-[input[data-invalid=true]]:border-destructive has-[input[data-focused=true]]:ring-1 has-[input[data-focused=true]]:ring-blue-500',
});

const inputStyles = tv({
  base: 'min-h-[2.125rem] py-1.5 pl-2 pr-10 w-full min-w-0 text-sm text-inherits border-0 focus:border-0 focus:shadow-none focus:ring-0 focus:outline-0 bg-transparent',
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
  className,
  name,
  renderEmptyState,
  Tag = DefaultTag,
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
    (keys: Set<Key>) => {
      const key = keys.values().next().value;
      if (key) {
        selectedList.remove(key);
        setFieldState({
          inputValue: '',
          selectedKey: null,
        });
        onItemRemove?.(key);
      }
    },
    [selectedList, onItemRemove]
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
    <>
      <LabeledGroup id={labelId} className={multiSelectStyles({ className })}>
        <Label className="sr-only">{label}</Label>
        {selectedList.items.length > 0 && (
          <TagGroup
            id={tagGroupId}
            aria-labelledby={labelId}
            className="contents"
            onRemove={onRemove}
          >
            <TagList
              items={selectedList.items}
              className={`outline-none ${
                selectedList.items.length !== 0 ? 'p-1' : ''
              }`}
            >
              {(item) => <Tag item={item} />}
            </TagList>
          </TagGroup>
        )}

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
            className={[
              'inline-flex flex-1 flex-wrap items-center gap-1 px-0',
              selectedList.items.length > 0 && 'ps-0',
            ].join(' ')}
          >
            <AriaInput
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
            />
            <div className="absolute right-1 top-0 bottom-0 flex items-center">
              <Button
                variant="secondary"
                className="rounded-lg p-1 outline-offset-0"
              >
                <Icon
                  name={IconName.ChevronsUpDown}
                  className="w-[1.25em] h-[1.25em] text-gray-500"
                />
              </Button>
            </div>
          </div>

          <PopoverOverlay className="min-w-[--trigger-width] p-0 bg-gray-100/90">
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
        </ComboBox>
      </LabeledGroup>

      {name && (
        <>
          {selectedKeys.map((key) => (
            <input hidden name={name} value={key} readOnly />
          ))}
        </>
      )}
    </>
  );
}
