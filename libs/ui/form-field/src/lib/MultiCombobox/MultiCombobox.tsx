import {
  useCallback,
  useEffect,
  useState,
  KeyboardEvent,
  useId,
  ComponentType,
  ReactNode,
  RefObject,
  PropsWithChildren,
  ComponentProps,
  useRef,
  useLayoutEffect,
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
import {
  FocusScope,
  type Placement,
  useFilter,
  useFocusManager,
} from 'react-aria';
import { ListBox, ListBoxItem, ListBoxSection } from '@restate/ui/listbox';
import { LabeledGroup } from './LabeledGroup';
import { tv } from '@restate/util/styles';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import {
  Popover,
  PopoverContent,
  PopoverOverlay,
  PopoverTrigger,
} from '@restate/ui/popover';
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

export interface MultiSelectProps<T extends object> extends Omit<
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
  inputClassName?: string;
  tagGroupClassName?: string;
  popoverClassName?: string;
  optionClassName?: string;
  onItemAdd?: (key: Key, value?: string) => void;
  onItemRemove?: (key: Key) => void;
  onItemUpdated?: (key: Key) => void;
  onInputSubmit?: (value: string) => boolean;
  renderOption?: (item: T) => ReactNode;
  renderEmptyState?: (inputValue: string) => React.ReactNode;
  children?: ComponentType<{
    item: T;
    onRemove?: VoidFunction;
    onUpdate?: (newValue: T) => void;
    formRef?: RefObject<HTMLFormElement | null>;
  }>;
  MenuTrigger?: ComponentType<unknown>;
  label: string;
  placeholder?: string;
  ref?: RefObject<HTMLInputElement | null>;
  prefix?: ReactNode;
  inputPrefix?: ReactNode;
  disabled?: boolean;
  multiple?: boolean;
  canRemoveItem?: (key: Key) => boolean;
  tagsPlacement?: 'inside' | 'outside';
  maxVisibleTags?: number | 'auto';
  tagOverflowStrategy?: 'partial' | 'all';
  overflowItemLabel?: string;
  overflowPrefix?: ReactNode;
  overflowClassName?: string;
  popoverPlacement?: Placement;
  showSectionTitle?: boolean;
}

const multiSelectStyles = tv({
  base: 'relative flex flex-row flex-wrap items-center',
  variants: {
    tagsPlacement: {
      inside:
        'has-[input[data-invalid=true]]:border-destructive rounded-lg border has-[input[data-focused=true]]:border-blue-500 has-[input[data-focused=true]]:ring-1 has-[input[data-focused=true]]:ring-blue-500 has-[input[data-invalid=true][data-focused=true]]:border-blue-500',
      outside: 'flex-nowrap gap-1.5',
    },
  },
});

const comboBoxStyles = tv({
  base: 'group flex flex-1',
  variants: {
    tagsPlacement: {
      inside: '',
      outside:
        'has-[input[data-invalid=true]]:border-destructive min-w-48 rounded-lg border has-[input[data-focused=true]]:border-blue-500 has-[input[data-focused=true]]:ring-1 has-[input[data-focused=true]]:ring-blue-500 has-[input[data-invalid=true][data-focused=true]]:border-blue-500',
    },
  },
});

const tagGroupStyles = tv({
  base: 'hidden max-w-full flex-wrap gap-1.5 has-[>*]:flex',
  variants: {
    tagsPlacement: {
      inside: 'px-1 py-1',
      outside: 'flex-nowrap',
    },
    adaptive: {
      true: 'shrink-0',
      false: '',
    },
  },
});

const popoverStyles = tv({
  base: 'w-(--trigger-width) min-w-fit bg-gray-100/90 p-0',
});

const inputStyles = tv({
  base: 'min-h-8.5 w-full min-w-0 border-0 bg-transparent py-1.5 pr-2 pl-0 text-sm text-current focus:border-0 focus:shadow-none focus:ring-0 focus:outline-0',
});

const overflowStyles = tv({
  base: 'flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-600',
});

const overflowMeasureStyles = tv({
  base: 'pointer-events-none invisible absolute flex h-7 items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-xs',
});

export function FormFieldMultiCombobox<
  T extends {
    id: Key;
    textValue: string;
    allowCustomValue?: boolean;
    disabled?: boolean;
  },
>({
  label,
  items,
  selectedList,
  onItemRemove,
  onItemAdd,
  onItemUpdated,
  onInputSubmit,
  renderOption,
  className,
  inputClassName,
  tagGroupClassName,
  popoverClassName,
  optionClassName,
  name,
  renderEmptyState,
  children = DefaultTag,
  MenuTrigger = DefaultMenuTrigger,
  placeholder,
  ref,
  prefix,
  inputPrefix,
  disabled,
  multiple,
  canRemoveItem,
  tagsPlacement = 'inside',
  maxVisibleTags,
  tagOverflowStrategy = 'partial',
  overflowItemLabel = 'item',
  overflowPrefix,
  overflowClassName,
  popoverPlacement,
  showSectionTitle = true,
  ...props
}: MultiSelectProps<T>) {
  const { contains } = useFilter({ sensitivity: 'base' });

  const selectedKeys = selectedList.items.map((i) => i.id);
  const [menuTrigger, setMenuTrigger] =
    useState<ComponentProps<typeof ComboBox>['menuTrigger']>('focus');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  useEffect(() => {
    formRef.current = inputRef.current?.closest('form') ?? null;
  }, []);
  const listBoxRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const tagGroupRef = useRef<HTMLDivElement | null>(null);
  const comboBoxRef = useRef<HTMLDivElement | null>(null);
  const overflowMeasureRef = useRef<HTMLSpanElement | null>(null);
  const tagWidthCacheRef = useRef(new Map<string, number>());
  const [automaticMaxVisibleTags, setAutomaticMaxVisibleTags] = useState(
    selectedList.items.length,
  );
  const inputRefObject = useObjectRef(mergeRefs(inputRef, ref));

  const filter = useCallback(
    (item: T, filterText: string) => {
      if (item.allowCustomValue) {
        return Boolean(filterText);
      }
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
      if (canRemoveItem && !canRemoveItem?.(key)) {
        return;
      }

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
    [selectedList, onItemRemove, inputRefObject, canRemoveItem],
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

  const onSelectionChange = useCallback(
    (id: Key | null) => {
      if (!id) {
        return;
      }

      const item = availableList.getItem(id);

      if (!item) {
        return;
      }

      if (!selectedKeys.includes(id)) {
        selectedList.append(item);
        const inputValue = fieldState.inputValue;
        setFieldState({
          inputValue: '',
          selectedKey: id,
        });
        onItemAdd?.(id, inputValue);
      }

      availableList.setFilterText('');
    },
    [
      availableList,
      fieldState.inputValue,
      onItemAdd,
      selectedKeys,
      selectedList,
    ],
  );

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
    if (lastKey && (!canRemoveItem || canRemoveItem(lastKey.id))) {
      selectedList.remove(lastKey.id);
      onItemRemove?.(lastKey.id);
    }

    setFieldState({
      inputValue: '',
      selectedKey: null,
    });
  }, [selectedList, onItemRemove, canRemoveItem]);

  const onKeyDownCapture = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && fieldState.inputValue === '') {
        deleteLast();
      }
      if (e.key === 'Enter' && !(e.metaKey || e.ctrlKey)) {
        if (fieldState.inputValue && onInputSubmit?.(fieldState.inputValue)) {
          setFieldState({ inputValue: '', selectedKey: null });
          availableList.setFilterText('');
          e.preventDefault();
          return;
        }
        const id = availableList.items.at(0)?.id;
        const focusedOption = listBoxRef.current?.querySelector(
          '[role=option][data-focused=true]',
        );
        const optionsCount =
          listBoxRef.current?.querySelectorAll('[role=option]').length;

        // TODO: revisit items with allowCustomValues
        // They always appear as an option and break validation
        if (id !== undefined && !focusedOption && Number(optionsCount) > 0) {
          onSelectionChange(id as Key);
          e.preventDefault();
        }
      }
    },
    [
      availableList,
      deleteLast,
      fieldState.inputValue,
      onInputSubmit,
      onSelectionChange,
    ],
  );

  const tagGroupId = useId();
  const labelId = useId();
  const updateAutomaticMaxVisibleTags = useCallback(() => {
    if (maxVisibleTags !== 'auto') {
      return;
    }

    const root = rootRef.current;
    const tagGroup = tagGroupRef.current;
    const comboBox = comboBoxRef.current;
    const overflowMeasure = overflowMeasureRef.current;
    const view = root?.ownerDocument.defaultView;
    if (!root || !tagGroup || !comboBox || !overflowMeasure || !view) {
      return;
    }

    tagGroup
      .querySelectorAll<HTMLElement>('[data-multi-combobox-tag]')
      .forEach((element) => {
        const key = element.dataset.multiComboboxTag;
        if (key) {
          tagWidthCacheRef.current.set(
            key,
            element.getBoundingClientRect().width,
          );
        }
      });

    const widths = selectedList.items.map((item) =>
      tagWidthCacheRef.current.get(String(item.id)),
    );
    if (widths.some((width) => width === undefined)) {
      setAutomaticMaxVisibleTags(selectedList.items.length);
      return;
    }

    const rootStyle = view.getComputedStyle(root);
    const tagGroupStyle = view.getComputedStyle(tagGroup);
    const comboBoxStyle = view.getComputedStyle(comboBox);
    const outerGap = parseCssPixels(rootStyle.columnGap);
    const tagGap = parseCssPixels(tagGroupStyle.columnGap);
    const inputMinimumWidth = parseCssPixels(comboBoxStyle.minWidth);
    const availableWidth = Math.max(
      root.clientWidth - inputMinimumWidth - outerGap,
      0,
    );
    const nextMaxVisibleTags = getAdaptiveVisibleTagCount(
      widths as number[],
      availableWidth,
      overflowMeasure.getBoundingClientRect().width,
      tagGap,
      tagOverflowStrategy,
    );

    setAutomaticMaxVisibleTags((current) =>
      current === nextMaxVisibleTags ? current : nextMaxVisibleTags,
    );
  }, [maxVisibleTags, selectedList.items, tagOverflowStrategy]);

  useLayoutEffect(() => {
    updateAutomaticMaxVisibleTags();
  }, [automaticMaxVisibleTags, updateAutomaticMaxVisibleTags]);

  useEffect(() => {
    if (maxVisibleTags !== 'auto') {
      return;
    }

    const root = rootRef.current;
    const tagGroup = tagGroupRef.current;
    const ResizeObserverConstructor =
      root?.ownerDocument.defaultView?.ResizeObserver;
    if (!root || !tagGroup || !ResizeObserverConstructor) {
      return;
    }

    const observer = new ResizeObserverConstructor(
      updateAutomaticMaxVisibleTags,
    );
    observer.observe(root);
    observer.observe(tagGroup);
    tagGroup
      .querySelectorAll<HTMLElement>('[data-multi-combobox-tag]')
      .forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [automaticMaxVisibleTags, maxVisibleTags, updateAutomaticMaxVisibleTags]);

  const resolvedMaxVisibleTags =
    maxVisibleTags === 'auto' ? automaticMaxVisibleTags : maxVisibleTags;
  const { visibleItems, hiddenItems } = partitionVisibleTags(
    selectedList.items,
    resolvedMaxVisibleTags,
  );
  const areAllTagsCollapsed =
    hiddenItems.length > 0 && visibleItems.length === 0;
  const Tag = children;
  const optionItems = availableList.items
    .filter(
      (item) => !item.allowCustomValue || availableList.items.length === 1,
    )
    .map((item) => (
      <ListBoxItem
        value={String(item.id)}
        key={item.id}
        disabled={item.disabled}
        className={optionClassName}
      >
        {item.allowCustomValue
          ? fieldState.inputValue
          : (renderOption?.(item) ?? item.textValue)}
      </ListBoxItem>
    ));

  return (
    <FocusScope>
      <LabeledGroup
        ref={rootRef}
        id={labelId}
        className={multiSelectStyles({ tagsPlacement, className })}
      >
        <Label className="sr-only">{label}</Label>

        <TagFocusManager
          ref={tagGroupRef}
          className={tagGroupStyles({
            tagsPlacement,
            adaptive: maxVisibleTags === 'auto',
            className: tagGroupClassName,
          })}
          id={tagGroupId}
        >
          {prefix}
          {visibleItems.map((item) => (
            <RemoveTagWithKeyboard
              key={item.id}
              tagKey={item.id}
              onRemove={onRemove.bind(null, item.id)}
            >
              <Tag
                item={item}
                onRemove={onRemove.bind(null, item.id)}
                onUpdate={onUpdate}
                formRef={formRef}
              />
            </RemoveTagWithKeyboard>
          ))}
          {maxVisibleTags === 'auto' && selectedList.items.length > 0 && (
            <span
              ref={overflowMeasureRef}
              aria-hidden="true"
              className={overflowMeasureStyles({
                className: overflowClassName,
              })}
            >
              {overflowPrefix}
              {tagOverflowStrategy === 'partial' ? '+' : ''}
              {selectedList.items.length} {overflowItemLabel}
              {selectedList.items.length === 1 ? '' : 's'}
              <Icon name={IconName.ChevronDown} className="h-3.5 w-3.5" />
            </span>
          )}
          {hiddenItems.length > 0 && (
            <Popover>
              <PopoverTrigger>
                <Button
                  type="button"
                  variant="secondary"
                  aria-label={
                    areAllTagsCollapsed
                      ? `${hiddenItems.length} active ${overflowItemLabel}${hiddenItems.length === 1 ? '' : 's'}`
                      : `${hiddenItems.length} more ${overflowItemLabel}${hiddenItems.length === 1 ? '' : 's'}`
                  }
                  className={overflowStyles({
                    className: overflowClassName,
                  })}
                >
                  {overflowPrefix}
                  {areAllTagsCollapsed ? '' : '+'}
                  {hiddenItems.length} {overflowItemLabel}
                  {hiddenItems.length === 1 ? '' : 's'}
                  <Icon name={IconName.ChevronDown} className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                placement="bottom end"
                className="w-fit max-w-[calc(100vw-2rem)] p-1"
              >
                <div className="flex flex-col items-start gap-1.5 p-1">
                  {hiddenItems.map((item) => (
                    <RemoveTagWithKeyboard
                      key={item.id}
                      tagKey={item.id}
                      onRemove={onRemove.bind(null, item.id)}
                    >
                      <Tag
                        item={item}
                        onRemove={onRemove.bind(null, item.id)}
                        onUpdate={onUpdate}
                        formRef={formRef}
                      />
                    </RemoveTagWithKeyboard>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </TagFocusManager>

        <ComboBox
          ref={comboBoxRef}
          {...props}
          allowsEmptyCollection
          menuTrigger={menuTrigger}
          className={comboBoxStyles({
            tagsPlacement,
            className: inputClassName,
          })}
          items={availableList.items}
          selectedKey={fieldState.selectedKey}
          inputValue={fieldState.inputValue}
          onSelectionChange={onSelectionChange}
          onInputChange={onInputChange}
          aria-labelledby={labelId}
          isDisabled={disabled}
        >
          <div className={'inline-flex flex-1 items-center gap-1 px-0 pl-1'}>
            {inputPrefix}
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
            <PopoverOverlay
              placement={popoverPlacement}
              className={popoverStyles({ className: popoverClassName })}
            >
              {multiple || selectedKeys.length === 0 ? (
                <ListBox
                  multiple
                  selectable
                  className="max-h-[inherit] overflow-auto border-none p-1 outline-0"
                  ref={listBoxRef}
                >
                  {showSectionTitle ? (
                    <ListBoxSection title={label}>{optionItems}</ListBoxSection>
                  ) : (
                    optionItems
                  )}
                </ListBox>
              ) : (
                <div className="flex items-center gap-1.5 px-4 py-2 text-sm text-zinc-500">
                  You can apply only one filter at a time.
                </div>
              )}
              {items.some((item) => item.allowCustomValue) && (
                <div className="mb-2 -translate-y-1 px-5 text-xs text-gray-400">
                  Select an option or enter a custom value.
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

export function partitionVisibleTags<T>(items: T[], maxVisibleTags?: number) {
  if (maxVisibleTags === undefined || items.length <= maxVisibleTags) {
    return { visibleItems: items, hiddenItems: [] as T[] };
  }
  const splitIndex = Math.max(items.length - Math.max(maxVisibleTags, 0), 0);
  return {
    visibleItems: items.slice(splitIndex),
    hiddenItems: items.slice(0, splitIndex),
  };
}

export function getAdaptiveVisibleTagCount(
  tagWidths: number[],
  availableWidth: number,
  overflowWidth: number,
  gap: number,
  overflowStrategy: 'partial' | 'all' = 'partial',
) {
  if (tagWidths.length === 0) {
    return 0;
  }

  const allTagsWidth =
    tagWidths.reduce((total, width) => total + width, 0) +
    gap * Math.max(tagWidths.length - 1, 0);
  if (allTagsWidth <= availableWidth) {
    return tagWidths.length;
  }
  if (overflowStrategy === 'all') {
    return 0;
  }

  let visibleCount = 0;
  let usedWidth = overflowWidth;
  for (let index = tagWidths.length - 1; index >= 0; index -= 1) {
    const width = tagWidths[index];
    if (width === undefined || usedWidth + gap + width > availableWidth) {
      break;
    }
    usedWidth += gap + width;
    visibleCount += 1;
  }
  return Math.max(visibleCount, 1);
}

function parseCssPixels(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function TagFocusManager({
  children,
  id,
  className,
  ref,
}: PropsWithChildren<{
  className?: string;
  id?: string;
  ref?: RefObject<HTMLDivElement | null>;
}>) {
  const focusManager = useFocusManager();
  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
        focusManager?.focusNext({ wrap: true });
        break;
      case 'ArrowLeft':
        focusManager?.focusPrevious({ wrap: true });
        break;
    }
  };

  return (
    <div ref={ref} onKeyDown={onKeyDown} id={id} className={className}>
      {children}
    </div>
  );
}

function RemoveTagWithKeyboard({
  children,
  onRemove,
  tagKey,
}: PropsWithChildren<{ onRemove?: VoidFunction; tagKey: Key }>) {
  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Backspace':
        onRemove?.();
        break;
    }
  };

  return (
    <div
      data-multi-combobox-tag={String(tagKey)}
      className="inline-flex min-w-0 shrink-0"
      onKeyDown={onKeyDown}
    >
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
