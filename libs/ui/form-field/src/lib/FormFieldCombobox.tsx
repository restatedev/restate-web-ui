import { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import {
  ComboBox as AriaComboBox,
  ComboBoxProps as AriaComboBoxProps,
  Label,
  Input as AriaInput,
  Group,
} from 'react-aria-components';
import { FormFieldError } from './FormFieldError';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { FormFieldLabel } from './FormFieldLabel';
import { PopoverOverlay } from '@restate/ui/popover';
import {
  ListBox,
  ListBoxItem,
  ListBoxItemProps,
  ListBoxSection,
  ListBoxSectionProps,
} from '@restate/ui/listbox';
import { tv } from 'tailwind-variants';

export interface ComboBoxProps<T extends object> {
  className?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  placeholder?: string;
  label?: ReactNode;
  errorMessage?: ComponentProps<typeof FormFieldError>['children'];
  value?: AriaComboBoxProps<T>['inputValue'];
  onChange?: AriaComboBoxProps<T>['onInputChange'];
  allowsCustomValue?: AriaComboBoxProps<T>['allowsCustomValue'];
  name?: AriaComboBoxProps<T>['name'];
  defaultValue?: AriaComboBoxProps<T>['defaultInputValue'];
  pattern?: string;
}

const inputStyles = tv({
  base: 'invalid:border-red-600 invalid:bg-red-100/70 focus:outline focus:border-gray-200 disabled:text-gray-500/80 disabled:placeholder:text-gray-300 disabled:border-gray-100 disabled:shadow-none   [&[readonly]]:text-gray-500/80 [&[readonly]]:bg-gray-100 read-only:shadow-none focus:shadow-none focus:outline-blue-600 focus:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] mt-0 bg-gray-100 rounded-lg border border-gray-200 py-1.5 placeholder:text-gray-500/70 px-2 w-full min-w-0 text-sm text-gray-900',
});

const containerStyles = tv({
  base: 'group flex flex-col gap-1',
});

export function FormFieldCombobox<T extends object>({
  className,
  required,
  disabled,
  placeholder,
  errorMessage,
  label,
  readonly,
  children,
  pattern,
  defaultValue,
  ...props
}: PropsWithChildren<ComboBoxProps<T>>) {
  return (
    <AriaComboBox
      isRequired={required}
      isDisabled={disabled}
      menuTrigger="focus"
      defaultInputValue={defaultValue}
      defaultSelectedKey={defaultValue}
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
      </Group>
      <FormFieldError>{errorMessage}</FormFieldError>
      <PopoverOverlay className="w-[--trigger-width] bg-gray-100/90">
        <ListBox className="outline-0 p-1 max-h-[inherit] overflow-auto border-none">
          {children}
        </ListBox>
      </PopoverOverlay>
    </AriaComboBox>
  );
}

export function ComboBoxItem(props: ListBoxItemProps) {
  return <ListBoxItem {...props} />;
}

export function ComboBoxSection(props: ListBoxSectionProps) {
  return <ListBoxSection {...props} />;
}
