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
import { tv } from '@restate/util/styles';

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
  base: 'mt-0 w-full min-w-0 rounded-lg border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-900 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] placeholder:text-gray-500/70 invalid:border-red-600 invalid:bg-red-100/70 read-only:shadow-none focus:border-gray-200 focus:shadow-none focus:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] focus:outline focus:outline-blue-600 disabled:border-gray-100 disabled:text-gray-500/80 disabled:shadow-none disabled:placeholder:text-gray-300 [&[readonly]]:bg-gray-100 [&[readonly]]:text-gray-500/80',
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
        <div className="absolute top-0 right-1 bottom-0 flex items-center">
          <Button
            variant="secondary"
            className="rounded-lg p-1 outline-offset-0"
          >
            <Icon
              name={IconName.ChevronsUpDown}
              className="h-[1.25em] w-[1.25em] text-gray-500"
            />
          </Button>
        </div>
      </Group>
      <FormFieldError>{errorMessage}</FormFieldError>
      <PopoverOverlay className="w-(--trigger-width) min-w-fit bg-gray-100/90">
        <ListBox className="max-h-[inherit] overflow-auto border-none p-1 outline-0">
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
