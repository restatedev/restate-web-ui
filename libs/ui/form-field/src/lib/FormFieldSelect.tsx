import {
  SelectProps as AriaSelectProps,
  Label,
  Select,
  SelectValue,
} from 'react-aria-components';
import { tv } from '@restate/util/styles';
import { FormFieldError } from './FormFieldError';
import { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import { Button } from '@restate/ui/button';
import { PopoverOverlay } from '@restate/ui/popover';
import { ListBox, ListBoxItem } from '@restate/ui/listbox';
import { FormFieldLabel } from './FormFieldLabel';
import { Icon, IconName } from '@restate/ui/icons';

const containerStyles = tv({
  base: '',
});

interface SelectProps
  extends Pick<
    AriaSelectProps<object>,
    'name' | 'autoFocus' | 'autoComplete' | 'validate'
  > {
  className?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  errorMessage?: ComponentProps<typeof FormFieldError>['children'];
  label?: ReactNode;
  defaultValue?: string;
  dropdownFooter?: ReactNode;
}
export function FormFieldSelect({
  className,
  required,
  disabled,
  autoComplete = 'off',
  placeholder,
  errorMessage,
  children,
  label,
  autoFocus,
  defaultValue,
  dropdownFooter,
  ...props
}: PropsWithChildren<SelectProps>) {
  return (
    <Select
      {...props}
      autoComplete={autoComplete}
      isRequired={required}
      isDisabled={disabled}
      className={containerStyles({ className })}
      placeholder={placeholder}
      defaultValue={defaultValue}
    >
      {!label && <Label className="sr-only">{placeholder}</Label>}
      {label && <FormFieldLabel>{label}</FormFieldLabel>}
      <div className="rounded-xl border border-gray-200 bg-gray-100 p-px shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]">
        <Button
          autoFocus={autoFocus}
          variant="secondary"
          className="flex w-full items-center gap-2 rounded-[0.625rem] px-2 py-1.5 text-sm group-invalid:border-red-600 group-invalid:bg-red-100/70"
        >
          <SelectValue className="min-w-0 flex-auto text-left placeholder-shown:text-gray-500" />
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-[1.25em] w-[1.25em] shrink-0 text-gray-500"
          />
        </Button>
      </div>
      <PopoverOverlay className="w-(--trigger-width) min-w-fit bg-gray-100/90 p-0">
        <ListBox className="m-0 rounded-xl border-none" selectable multiple>
          {children}
        </ListBox>
        <div className="px-3 text-xs opacity-70">{dropdownFooter}</div>
      </PopoverOverlay>
      <FormFieldError children={errorMessage} />
    </Select>
  );
}

export function Option({
  children,
  value = children,
}: {
  children: string;
  value?: string;
}) {
  return (
    <ListBoxItem className="rounded-lg px-2" value={value}>
      {children}
    </ListBoxItem>
  );
}
