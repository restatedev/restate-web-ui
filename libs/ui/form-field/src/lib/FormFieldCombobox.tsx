import { ComponentProps, ReactNode, useMemo, useState } from 'react';
import {
  ComboBox as AriaComboBox,
  ComboBoxProps as AriaComboBoxProps,
  Label,
  Input as AriaInput,
  Group,
  Collection,
} from 'react-aria-components';
import { useFilter } from 'react-aria';
import { FormFieldError } from './FormFieldError';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { FormFieldLabel } from './FormFieldLabel';
import { PopoverOverlay } from '@restate/ui-popover';
import { ListBox, ListBoxItem, ListBoxSection } from '@restate/ui-listbox';
import { tv } from '@restate/util-styles';

export interface ComboBoxOption {
  id: string;
  label?: ReactNode;
  disabled?: boolean;
}

export interface ComboBoxOptionSection {
  id: string;
  title?: ReactNode;
  description?: ReactNode;
  items: readonly ComboBoxOption[];
}

type ComboBoxEntry = ComboBoxOption | ComboBoxOptionSection;

export interface ComboBoxProps {
  options: readonly ComboBoxEntry[];
  className?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  placeholder?: string;
  label?: ReactNode;
  errorMessage?: ComponentProps<typeof FormFieldError>['children'];
  value?: AriaComboBoxProps<ComboBoxEntry>['inputValue'];
  onChange?: AriaComboBoxProps<ComboBoxEntry>['onInputChange'];
  allowsCustomValue?: AriaComboBoxProps<ComboBoxEntry>['allowsCustomValue'];
  allowsEmptyCollection?: AriaComboBoxProps<ComboBoxEntry>['allowsEmptyCollection'];
  renderEmptyState?: ComponentProps<typeof ListBox>['renderEmptyState'];
  name?: AriaComboBoxProps<ComboBoxEntry>['name'];
  defaultValue?: AriaComboBoxProps<ComboBoxEntry>['defaultInputValue'];
  defaultFilter?: AriaComboBoxProps<ComboBoxEntry>['defaultFilter'];
  onOpenChange?: AriaComboBoxProps<ComboBoxEntry>['onOpenChange'];
  pattern?: string;
}

const inputStyles = tv({
  base: 'mt-0 w-full min-w-0 rounded-lg border border-default bg-muted px-2 py-1.5 text-sm text-primary shadow-[inset_0_1px_0px_0px_--theme(--box-shadow-color-default/3%)] placeholder:text-subtle invalid:border-danger-strong invalid:bg-danger-muted/70 read-only:shadow-none focus:border-default focus:shadow-none focus:[box-shadow:inset_0_1px_0px_0px_--theme(--box-shadow-color-default/3%)] focus:outline-2 focus:outline-focus disabled:border-muted disabled:text-subtle disabled:shadow-none disabled:placeholder:text-faint [&[readonly]]:bg-muted [&[readonly]]:text-subtle',
});

const containerStyles = tv({
  base: 'group flex flex-col gap-1',
});

export function FormFieldCombobox({
  className,
  required,
  disabled,
  placeholder,
  errorMessage,
  label,
  readonly,
  options,
  pattern,
  defaultValue,
  value,
  onChange,
  renderEmptyState,
  defaultFilter,
  onOpenChange,
  allowsCustomValue,
  allowsEmptyCollection = true,
  ...props
}: ComboBoxProps) {
  const [filterText, setFilterText] = useState('');
  const { contains } = useFilter({ sensitivity: 'base' });
  const filter = defaultFilter ?? contains;
  const items = useMemo(
    () =>
      options.flatMap((option): ComboBoxEntry[] => {
        if ('items' in option) {
          const items = option.items.filter((item) =>
            filter(item.id, filterText),
          );
          return items.length > 0 ? [{ ...option, items }] : [];
        }
        return filter(option.id, filterText) ? [option] : [];
      }),
    [options, filter, filterText],
  );

  return (
    <AriaComboBox
      isRequired={required}
      isDisabled={disabled}
      menuTrigger="focus"
      defaultInputValue={defaultValue}
      {...(value !== undefined && { inputValue: value })}
      onInputChange={(value) => {
        setFilterText(value);
        onChange?.(value);
      }}
      onOpenChange={(isOpen, trigger) => {
        if (isOpen && trigger !== 'input') {
          setFilterText('');
        }
        onOpenChange?.(isOpen, trigger);
      }}
      items={items}
      allowsCustomValue={allowsCustomValue}
      allowsEmptyCollection={allowsEmptyCollection}
      {...props}
      className={containerStyles({ className })}
    >
      {!label && <Label className="sr-only">{placeholder}</Label>}
      {label && <FormFieldLabel>{label}</FormFieldLabel>}
      <Group className="relative">
        <AriaInput
          className={inputStyles}
          placeholder={placeholder}
          aria-label={placeholder}
          pattern={pattern}
        />
        <div className="absolute top-0 right-1 bottom-0 flex items-center">
          <Button
            variant="secondary"
            className="rounded-lg p-1 outline-offset-0"
          >
            <Icon
              name={IconName.ChevronsUpDown}
              className="h-[1.25em] w-[1.25em] text-muted"
            />
          </Button>
        </div>
      </Group>
      <FormFieldError>{errorMessage}</FormFieldError>
      <PopoverOverlay className="w-(--trigger-width) min-w-fit bg-overlay/90">
        <ListBox
          className="max-h-[inherit] overflow-auto border-none p-1 outline-0"
          renderEmptyState={
            renderEmptyState ??
            (() => (
              <p className="px-2 py-1 text-xs text-muted">
                {allowsCustomValue
                  ? 'No matching options. Enter a custom value.'
                  : 'No matching options.'}
              </p>
            ))
          }
        >
          <Collection items={items}>
            {(option) =>
              'items' in option ? (
                <ListBoxSection
                  title={option.title}
                  description={option.description}
                >
                  <Collection items={option.items}>
                    {(item) => (
                      <ListBoxItem value={item.id} disabled={item.disabled}>
                        {item.label ?? item.id}
                      </ListBoxItem>
                    )}
                  </Collection>
                </ListBoxSection>
              ) : (
                <ListBoxItem value={option.id} disabled={option.disabled}>
                  {option.label ?? option.id}
                </ListBoxItem>
              )
            }
          </Collection>
        </ListBox>
      </PopoverOverlay>
    </AriaComboBox>
  );
}
